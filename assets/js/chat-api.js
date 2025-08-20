function filterHistory(history) {
  const cleaned = (history || [])
    .filter(m => !m.internal)
    .map(m => ({ role: String(m.role || '').trim(), content: String(m.content || '') }))
    .filter(m => m.role && m.content);

  const MAX = 40;
  return cleaned.length > MAX ? cleaned.slice(-MAX) : cleaned;
}

export async function sendMessageToACA(question, history, alreadyPrompted) {
    const res = await fetch(chatConfig.ajax.url, {
        method: 'POST',
        body: new URLSearchParams({
            action: 'aca_send_message',
            _ajax_nonce: chatConfig.nonce,
            question: question,
            history: JSON.stringify(filterHistory(history)),
            alreadyPrompted: alreadyPrompted
        })
    });

    const data = await res.json();
    if(!data.success) {
        //console.error("AJAX returned:", data);
        throw new Error(data?.data?.error || 'Unknown server error');
    }

    return data.data;

}
