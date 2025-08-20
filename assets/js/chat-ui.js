import { sendMessageToACA } from './chat-api.js';
import { loadHistory, saveHistory, getFollowPromptState, store_prompt_flag } from './chat-storage.js';
import { marked } from '../vendor/marked/marked.esm.js';
import DOMPurify from '../vendor/dompurify/purify.es.min.js';




function el(tag, attrs = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    kids.forEach(k => n.append(k));
    return n;
}

function renderMessageToHTML(rawText) {
  const html = marked.parse(rawText, { breaks: true });

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b','i','em','strong','a','p','ul','ol','li','code','pre','blockquote','br','span'],
    ALLOWED_ATTR: ['href','title','target','rel','class']
  });
}

export function render(rootID) {
    console.log('marked:', marked);
    console.log('DOMPurify:', DOMPurify);
    let chatHistory = loadHistory();

    const root = document.getElementById(rootID);
    if (!root) return;

    const box = el('div', { class: 'aca-chat'});
    const header = el('div', { class: 'aca-chat-header' }, 'AI Chatbot (Beta)');
    const log = el('div', { class: 'aca-chat-log'});
    const form = el('form', { class: 'aca-chat-form'});
    const content = el('div', { class: 'aca-chat-content' });
    const input = el('input', { class: 'aca-chat-input', type: 'text', placeholder: 'Type a message', maxlength: '280'});
    const sendBtn = el('button', { class: 'aca-chat-send', type: 'submit'}, 'Send');
    const miniBtn = el('button', {class: 'aca-chat-minimize', type: 'button', 'aria-label': 'Minimize chat', 'aria-expanded': 'true'}, '—')


    
    form.append(input, sendBtn);
    header.append(miniBtn)
    content.append(log, form)
    box.append(header, content);
    root.append(box);

    function showFollowPrompt() {
        const html_text = `
            <div class="aca-follow-card" style="display:grid; gap:.6rem;">
            <div style="display:flex; align-items:center; gap:.5rem; font-weight:600;">
                <span class="dashicons dashicons-megaphone" aria-hidden="true"></span>
                Contact & Submissions
            </div>

            <p style="margin:0; color:#444;">
                Enjoying our content? You can reach LCI via social channels on our contact us page!. 
            </p>

            <div style="display:flex; gap:.5rem; flex-wrap:wrap;">
                <a class="aca-btn" href="/contact" target="_blank" rel="noopener" 
                style="display:inline-flex; align-items:center; gap:.4rem; padding:.5rem .7rem; border:1px solid #ddd; border-radius:.5rem; text-decoration:none;">
                <span class="dashicons dashicons-admin-links" aria-hidden="true"></span>
                Open Contact Page
                </a>

                <a class="aca-btn" href="/submissions" target="_blank" rel="noopener"
                style="display:inline-flex; align-items:center; gap:.4rem; padding:.5rem .7rem; border:1px solid #ddd; border-radius:.5rem; text-decoration:none;">
                <span class="dashicons dashicons-media-text" aria-hidden="true"></span>
                Submissions
                </a>

                <a class="aca-btn" href="mailto:hello@example.com"
                style="display:inline-flex; align-items:center; gap:.4rem; padding:.5rem .7rem; border:1px solid #ddd; border-radius:.5rem; text-decoration:none;">
                <span class="dashicons dashicons-email" aria-hidden="true"></span>
                Email Us
                </a>
            </div>

            <small style="color:#666;">
                Note: We don’t accept solicitations from political candidates for interviews or articles.
            </small>
            </div>
        `;

        addMessage('assistant', html_text, true);
        store_prompt_flag(true, 7);
    }

    function setMinimized (min) {
        box.classList.toggle('is-minimized', min);
        miniBtn.textContent = min ? '+' : '—';
        miniBtn.setAttribute('aria-expanded', (!min).toString());
        sessionStorage.setItem('aca_chat_min', min ? '1' : '0');
    }

    miniBtn.addEventListener('click', () => {
        const next = !box.classList.contains('is-minimized');
        setMinimized(next);
    });

    const saved = sessionStorage.getItem('aca_chat_min') === '1';
    if (saved) setMinimized(true);

    
    function addMessage(role, text, isInternal=false) {
        if (isInternal) {
            chatHistory.push({role, content: text, internal: true});
        } else {
            chatHistory.push({role, content: text});
        }

        saveHistory(chatHistory);
        append(role, text, isInternal);
    }
    
    function append(role, text, isInternal=false) {
        const row = el('div', { class: 'aca-chat-row ' + role});
        const bubble = el('div', { class: 'aca-chat-bubble'});
        if (isInternal) {
            bubble.innerHTML = DOMPurify.sanitize(text);
        } else if (role === 'assistant') {
            bubble.innerHTML = renderMessageToHTML(text);
        } else {
            bubble.textContent = text;
        }


        row.append(bubble);
        log.append(row);
        log.scrollTop = log.scrollHeight;
    }



    function addTypingBubble() {
        const row = el('div', { class: 'aca-chat-row assistant' });
        const bubble = el('div', { class: 'aca-chat-bubble typing' });

        bubble.append(
            el('span', { class: 'aca-typing-dot' }),
            el('span', { class: 'aca-typing-dot' }),
            el('span', { class: 'aca-typing-dot' })
        );

        row.append(bubble);
        log.append(row);
        log.scrollTop = log.scrollHeight;

        // return a small API to remove this typing row
        return {
            remove() {
            row.remove();
            },
            replaceWithHTML(html) {
            bubble.classList.remove('typing');
            bubble.innerHTML = html;
            },
            node: row
        };
        }
    // restore history
    chatHistory.forEach(msg => append(msg.role, msg.content));

    form.addEventListener('submit', async(e) => {
        e.preventDefault();
        
        const text = input.value.trim();
        input.value = '';
        if (text.length <= 1){
            return
        }

        addMessage('user', text);
        input.disabled = true;
        sendBtn.disabled = true;

        const typing = addTypingBubble();
        
        const state = getFollowPromptState()
        const alreadyPrompted = !!(state && state.flag);
        try {
            const reply = await sendMessageToACA(text, chatHistory, alreadyPrompted);
            const safeHTML = renderMessageToHTML(reply.answer || 'No Answer');
            typing.replaceWithHTML(safeHTML);
            log.scrollTop = log.scrollHeight;

            chatHistory.push({ role: 'assistant', content: reply.answer });
            saveHistory(chatHistory);

            if (reply.delayPrompt){
                store_prompt_flag(true, 1)
            }
            //else if (reply.promptFlag){
            else if (!alreadyPrompted && reply.promptFlag){
                showFollowPrompt();
            }
        } catch (err) {
            typing.remove();
            addMessage('assistant', `Error: ${err.message}`)
        } finally {
            input.disabled = false;
            sendBtn.disabled = false;
            input.focus();
        }
        //console.log('Current chatHistory:', JSON.stringify(chatHistory));
    });
}