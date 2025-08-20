import {render} from './chat-ui.js';

const rootID = 'wp-aca-chat-root';

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => render(rootID));
} else {
    render(rootID);
}