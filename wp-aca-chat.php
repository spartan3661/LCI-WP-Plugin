<?php
/*
Plugin Name: Azure Chatbot Interface V2
Description: Provides the frontend interface for Azure hosted RAG Chatbot
Version: 0.0.46
Author: Zongyu Carnes
*/

if (!defined('ABSPATH')) exit;

// wp-aca-chat.php
require_once __DIR__ . '/includes/aca-endpoint.php';
// load scripts
add_action('wp_enqueue_scripts', function() {
    $ver = '0.0.46';
    wp_enqueue_style('aca-chat', plugin_dir_url(__FILE__).'assets/css/chat.css', [], $ver);

    wp_enqueue_script('aca-chat', plugin_dir_url(__FILE__).'assets/js/chat.js', [], $ver, true);

    wp_localize_script('aca-chat', 'chatConfig',[
        'ajax'  => ['url' => admin_url('admin-ajax.php')],
        'nonce' => wp_create_nonce('aca_chat_nonce'),
    ]);

    // add type="module"
    add_filter('script_loader_tag', function($tag, $handle, $src) {
        if ($handle === 'aca-chat') {
            return '<script type="module" src="' . esc_url($src) . '"></script>';
        }
        return $tag;
    }, 10, 3);
});

add_action('wp_enqueue_scripts', function () {
  wp_enqueue_style('dashicons');
});

// mount chat interface to bottom of page
add_action('wp_footer', function() {
    echo '<div id="wp-aca-chat-root"></div>';
});