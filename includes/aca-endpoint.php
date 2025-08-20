<?php
if (!defined('ABSPATH')) exit;

add_action('wp_ajax_aca_send_message', 'aca_send_message_handler');
add_action('wp_ajax_nopriv_aca_send_message', 'aca_send_message_handler');

//add_action('wp_ajax_aca_send_message', 'aca_send_message_handler_dummy');
//add_action('wp_ajax_nopriv_aca_send_message', 'aca_send_message_handler_dummy');
function aca_send_message_handler_dummy() {
    check_ajax_referer('aca_chat_nonce');

    // Grab posted values
    $question = sanitize_text_field($_POST['question'] ?? '');
    $history  = json_decode(stripslashes($_POST['history'] ?? '[]'), true);

    error_log("Dummy handler called. Question: $question");
    error_log("History: " . print_r($history, true));

    $dummy_answer     = "This is a test reply for: " . $question . ". ";
    $dummy_promptFlag = false;
    $dummy_delay      = false;

    wp_send_json_success([
        'answer'     => $dummy_answer . "This is **bold**, this is *italic*, and this is `code`.",
        'promptFlag' => $dummy_promptFlag,
        'delayPrompt'=> $dummy_delay,
    ]);
}


function aca_send_message_handler() {
    check_ajax_referer('aca_chat_nonce');

    $question = sanitize_text_field($_POST['question'] ?? '');
    $history = json_decode(stripslashes(($_POST['history'] ?? '[]')), true);

    // Grab tokens
    $token_response = wp_remote_post(
        'https://login.microsoftonline.com/' . AZURE_TENANT_ID . '/oauth2/v2.0/token',
        [
            'timeout' => 30,
            'body' => [
                'client_id'     => AZURE_CLIENT_ID,
                'client_secret' => AZURE_CLIENT_KEY,
                'scope'         => AZURE_API_URI . '/.default',
                'grant_type'    => 'client_credentials'
            ]
        ]
    );

    if (is_wp_error($token_response)) {
        wp_send_json_error(['error' => $token_response->get_error_message()], 500);
    }

    $token_data = json_decode(wp_remote_retrieve_body($token_response), true);
    if (empty($token_data['access_token'])) {
        wp_send_json_error(['error' => 'Could not get Azure Token'], 500);
    }

    $token = $token_data['access_token'];

    // call ACA endpoint
    $dt = new DateTime('now', new DateTimeZone('America/Chicago'));
    $eaternTime = $dt->format(DateTime::ATOM);
    $alreadyPrompted = filter_var($_POST['alreadyPrompted'] ?? false, FILTER_VALIDATE_BOOL);

    $api_response = wp_remote_post(
        ACA_ENDPOINT . '/ask',
        [
            'timeout' => 30,
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type' => 'application/json'
            ],
            'body' => wp_json_encode([
                'question' => $question,
                'history'  => $history,
                'time' => $eaternTime,
                'alreadyPrompted' => $alreadyPrompted
            ])
        ]
    );

    if (is_wp_error($api_response)) {
        //error_log(print_r($api_response, true));
        wp_send_json_error(['error' => $api_response->get_error_message()], 500);
    }

    $api_data = json_decode(wp_remote_retrieve_body($api_response), true);
    //error_log(print_r($api_data, true));
    //error_log(print_r($history, true));

    wp_send_json_success($api_data);

}