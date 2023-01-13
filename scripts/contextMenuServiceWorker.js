const getKey = () => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['openai-key'], (result) => {
            if (result['openai-key']) {
                const decodedKey = atob(result['openai-key']);
                resolve(decodedKey);
            }
        })
    })
};

const sendMessage = (content) => {
    chrome.tabs.query({ active: true, currentWindow: true}, (tabs) => {
        const activeTab = tabs[0].id;

        chrome.tabs.sendMessage(
            activeTab,
            {message: 'inject', content},
            (response) => {
                if (response.status === 'failed') {
                    console.log('injection failed');
                }
            }
        );
    });
};


const generate = async (prompt) => {
    // Get your API key from storage

    const key = await getKey();
    const url = "https://api.openai.com/v1/completions";

    // Call completions endpoint

    const completionResponse = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
            model: 'text-davinci-003',
            prompt: prompt,
            max_tokens: 1250,
            temperature: 0.7,
        }),
    });

    const completion = await completionResponse.json();
    return completion.choices.pop();
};

const generateCompletionAction = async (info) => {

    try {
        sendMessage('generating....');
        const {selectionText} = info;

        const basePromptPrefix = `
        Write me an easy-to-remember jingle to sing that teaches children about the topic below. The jingle should be catchy and also rhyme.

        Title:
        `;

        const baseCompletion = await generate(`${basePromptPrefix}${selectionText}`);

        const secondPrompt = `
        Take the following lyrics and write a song that sounds like it was written by Elmo from Sesame Street. Make sure the song is funny and easy to remember for children.

        Title: ${selectionText}

        Song Lyrics: ${baseCompletion.text}

        Sesame Street Song by Elmo:
        `;

        const secondPromptCompletion = await generate(secondPrompt);

        sendMessage(secondPromptCompletion.text);
    } catch (error) {
        console.log(error);
        sendMessage(error.toString());
    }

};

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'context-run',
        title: 'Generate song lyrics',
        contexts: ['selection'],
    });
});

chrome.contextMenus.onClicked.addListener(generateCompletionAction);