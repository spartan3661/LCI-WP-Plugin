export function saveHistory(history) {
    sessionStorage.setItem('aca-chat-history', JSON.stringify(history));
}

export function loadHistory() {
    return JSON.parse(sessionStorage.getItem('aca-chat-history') || '[]');
}

export function store_prompt_flag(flag, daysToLive) {
    const state = {
        flag: !!flag,
        date: new Date().toISOString()
    };
    localStorage.setItem("chat_follow_prompt_flag", JSON.stringify(state));

    if (daysToLive) {
        state.expires = Date.now() + daysToLive * 24 * 60 * 60 * 1000;
    }
    localStorage.setItem("chat_follow_prompt_flag", JSON.stringify(state));
}

export function getFollowPromptState() {
    const raw = localStorage.getItem("chat_follow_prompt_flag");
    if (!raw) return null;
    try {
        const state = JSON.parse(raw);
        if (state.expires && Date.now() > state.expires) {
            localStorage.removeItem("chat_follow_prompt_flag");
            return null;
        }

        return state;
    } catch {
        return null;
    }
}