let isDragging = false;
function onTouchStarted(event) {
    isDragging = true;
    const touch = event.touches[0];
    const offsetX = touch.clientX - event.target.getBoundingClientRect().left;
    const offsetY = touch.clientY - event.target.getBoundingClientRect().top;

    event.target.setAttribute("offsetX", offsetX);
    event.target.setAttribute("offsetY", offsetY);
    event.target.style.zIndex = 2;
}

function onTouchMoved(event) {
    if (isDragging) {
        const touch = event.touches[0];
        const offsetX = event.target.getAttribute("offsetX");
        const offsetY = event.target.getAttribute("offsetY");

        touch.target.style.position = "fixed";
        touch.target.style.left = `${touch.clientX - offsetX}px`;
        touch.target.style.top = `${touch.clientY - offsetY}px`;
        event.preventDefault(); // Prevents scrolling during drag
    }
}

function onTouchEnded(event) {
    event.preventDefault();
    if (isDragging) {
        isDragging = false;
        const  { clientX, clientY, target } = event.changedTouches[0];
        let parent = Array.from(document.elementsFromPoint(clientX, clientY))
            .filter(elem => elem.classList.contains(constants.droppable))
            .shift();
        
        if (parent) {
            const scrollPlaceholderId = parent.getAttribute(constants.scrollPlaceholder);
            if (scrollPlaceholderId) {
                parent = document.getElementById(scrollPlaceholderId);
            }

            parent.appendChild(target);
            updateCountLabels();
        }

        target.style.position = "unset";
        event.target.style.zIndex = 0;
    }
}

function onRightClick(event) {
    event.preventDefault();
    document.getElementById(constants.hand)
        .appendChild(event.target);
}

function onCardClick(event) {
    event.preventDefault();
    const cardId = event.target.id.split(":")[0];
    const card = global.deckData[cardId];

    if (!card) {
        alert(`Card No: ${cardId} not found!`);
        return;
    }

    document.getElementById(constants.cardDetails)
        .style.display = "flex";

    document.getElementById(constants.cardDetailsImage)
        .src = card.imageUrl || constants.backCardImg;

    document.getElementById(constants.cardDetailsDescription)
        .innerHTML = card.description.replace("\n", "<br>") || constants.noDescription;
}

function onCardDetailsClick() {
    document.getElementById(constants.cardDetails)
        .style.display = "none";
}

function allowDrop(event) {
    event.preventDefault();
}

function onDragStarted(event) {
    event.dataTransfer.setData("cardId", event.target.id);
}

function onCardDropped(event) {
    event.preventDefault();
    const cardId = event.dataTransfer.getData("cardId");
    const cardElement = document.getElementById(cardId);
    let parent = event.target;

    while (!parent.classList.contains(constants.droppable)) {
        parent = parent.parentElement;
    }
    parent.appendChild(cardElement);

    updateCountLabels();
}

function onPlaceHolderDropped(event) {
    event.preventDefault();

    const cardId = event.dataTransfer.getData("cardId");
    const cardElement = document.getElementById(cardId);
    let placeHolder = event.target;

    while (!placeHolder.getAttribute(constants.scrollPlaceholder)) {
        placeHolder = placeHolder.parentElement;
    }
    
    const scrollerId = placeHolder.getAttribute(constants.scrollPlaceholder);
    const scroller = document.getElementById(scrollerId)
    scroller.appendChild(cardElement);
    updateCountLabels();
}

function onDeckClick(event) {
    event.preventDefault();
    let placeHolder = event.target;

    while (!placeHolder.getAttribute(constants.scrollPlaceholder)) {
        placeHolder = placeHolder.parentElement;
    }

    const scrollerId = placeHolder.getAttribute(constants.scrollPlaceholder);
    const targetScroller = document.getElementById(scrollerId);

    if (targetScroller.classList.contains("removed")) {
        targetScroller.classList.remove("removed");
        targetScroller.classList.add("not-removed");
    } else if (targetScroller.classList.contains("not-removed")) {
        targetScroller.classList.remove("not-removed");
        targetScroller.classList.add("removed");
    }

    Array.from(document.getElementsByClassName("h-scroller"))
        .forEach(scroller =>
        {
            if (scroller.id !== targetScroller.id) {
                scroller.classList.remove("not-removed");
                scroller.classList.add("removed");
            }
        });
}



function onWheelMoved(event) {
    event.preventDefault();
    document.getElementById(constants.hand).scrollLeft += event.deltaY;
}

function onFileImported(event) {
    const file = event.target.files[0];
    if (!file)
    {
        alert("no files were imported");
    }

    const reader = new FileReader();

    reader.onload = function() {
        const fileContent = reader.result;

        cleanData();
        let deck = {};

        let lines = fileContent.split("\n");
        if (!lines || !lines.length)
        {
            alert("file has no content");
        }

        let isMainDeck = false;
        let isExtraDeck = false;

        lines.forEach(line =>
        {
            line = line.replace("\r", "").trim();
            if (line === "#main")
            {
                isMainDeck = true;
                return;
            }

            if (line === "#extra")
            {
                isMainDeck = false;
                isExtraDeck = true;
                return;
            }

            if (line === "!side")
            {
                isMainDeck = false;
                isExtraDeck = false;
                return;
            }

            if (isMainDeck || isExtraDeck)
            {
                var count = 1;
                if (deck[line]) {
                    count = ++deck[line].count;
                }

                deck[line] = {
                    isMainDeck, isExtraDeck, count
                };
            }
        });

        global.deckData = deck;
    };

    reader.onloadend = async () => {
        await getCardData();
        addCards();
        alert("Cards successfully added to Deck!!");
    };

    reader.readAsText(file);
}

async function downloadImage(imageSrc) {
    const image = await fetch(imageSrc);
    const imageBlog = await image.blob();
    const imageUrl = URL.createObjectURL(imageBlog);

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'image file name here';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function cleanData() {
    global.deckData = {};
}

async function getCardData() {
    let ids = Object.keys(global.deckData);
    let dataItems = await getCardDataFromMD();

    if (!dataItems.length) {
        dataItems = await getCardDataFromGit();
    }

    ids.forEach(id => {
        const itemFound = dataItems.find(dataItem => dataItem.konamiID === id);
        if (itemFound) {
            processCardData(itemFound);
        }
    });
}

async function getCardDataFromMD() {
    try {
        let ids = Object.keys(global.deckData);
        const requestUrl = constants.getCardsByIdsUrl + ids.join(",");
        const response = await fetch(requestUrl);
    
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        } 
        
        return await response.json();
    }
    catch(error) {
        console.log(error);
        return [];
    }
}

async function getCardDataFromGit() {
    try {
        const response = await fetch("https://alvarodiaz889.github.io/board-game/resources/data.json");
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let result = "";
        let done = false;

        // Read from the stream
        while (!done) {
            const { value, done: streamDone } = await reader.read();
            done = streamDone;
            if (value) {
                const chunk = decoder.decode(value, { stream: !done }); 
                result += chunk;
            }
        }
        result = result.replace(/[^\x20-\x7E]/g, "");
        result = JSON.parse(result);
        
        return result;
    }
    catch(error) {
        console.log(error);
        return [];
    }
}

function openDataReader() {
    document.getElementById("data-selector").click();
    // setTimeout(dataSelector.click(), constants.waitingTime);
}

async function getCardDataFromFile(event) {
    const file = event.target.files[0];
    if (!file)
    {
        alert("no files were imported");
    }

    const reader = new FileReader();

    reader.onload = function() {
        const fileContent = JSON.parse(reader.result);
        if (fileContent.length) {
            fileContent.forEach(cardData => processCardData(cardData));
        }
    };

    reader.onloadend = function() {
        addCards();
        alert("cards added locally!!");
    }

    reader.readAsText(file);
}

function addCards() {
    let ids = Object.keys(global.deckData);
    let deckCards = document.getElementById("deck");
    let extraDeckCards = document.getElementById("extra-deck");

    deckCards.textContent = "";
    extraDeckCards.textContent = "";

    for (let cardId of ids) {
        let card = global.deckData[cardId];

        for (let counter = 1; counter <= card.count; counter++) {
            if (card.isMainDeck) {
                deckCards.appendChild(createCardElement(card, counter));
            } 
            if (card.isExtraDeck) {
                extraDeckCards.appendChild(createCardElement(card, counter));
            }
        }
    }
    
    updateCountLabels();
}

function updateCountLabels() {
    removeBackCard(constants.extraDeckPlaceholder);
    removeBackCard(constants.deckPlaceholder);

    const { deckCount, extraDeckCount, graveCount, banishedCount } = getCardsCount();

    if (extraDeckCount) {
        setBackCard(constants.extraDeckPlaceholder);
    }

    if (deckCount) {
        setBackCard(constants.deckPlaceholder);
    }

    document.getElementById(constants.extraDeckCounter).textContent = extraDeckCount;
    document.getElementById(constants.deckCounter).textContent = deckCount;
    document.getElementById(constants.graveCounter).textContent = graveCount;
    document.getElementById(constants.banishedCounter).textContent = banishedCount;
}

function getCardsCount() {
    return {
        deckCount: document.getElementById("deck").childElementCount,
        extraDeckCount: document.getElementById("extra-deck").childElementCount,
        graveCount: document.getElementById("grave").childElementCount,
        banishedCount: document.getElementById("banished").childElementCount
    };
}

function processCardData(card){
    let tmpCard = global.deckData[card.konamiID];
    if (tmpCard && !tmpCard._id) {
        tmpCard = { 
            ...tmpCard,
            ...card,
            imageUrl: constants.imageUrl.replace("{0}", card._id)
        };        
        
        global.deckData[card.konamiID] = tmpCard;
    }
}

function createCardElement(card, counter) {
    let background = card._id ? constants.backgroundImage
        .replace("{0}", card._id) : constants.backCardImg;

    let cardElement = document.createElement("div");
    cardElement.id = `${card.konamiID}:${counter}`;
    cardElement.className = "card card-height card-width";
    cardElement.style.background = background;
    cardElement.draggable = true;
    cardElement.ondragstart = onDragStarted;
    cardElement.onclick = onCardClick;
    cardElement.oncontextmenu = onRightClick;
    cardElement.ontouchstart = onTouchStarted;
    cardElement.ontouchmove = onTouchMoved;
    cardElement.ontouchend = onTouchEnded;

    return cardElement;
}

function createPlaceHolders() {
    let field = document.getElementById("field");
    
    for (let rowN = 1; rowN <= 3; rowN++) {
        let row = document.createElement("div");
        row.className = "card-row card-row-height";
        for (let n = 1; n <= 6; n++) {
            let placeHolder = document.createElement("div");
            placeHolder.className = "card-placeholder card-height card-width border-white droppable";
            placeHolder.ondrop = onCardDropped;
            row.appendChild(placeHolder);
        }
        field.appendChild(row);
    }
}

function setBackCard(id) {
    document.getElementById(id).classList.add("back-card");
}

function removeBackCard(id) {
    document.getElementById(id).classList.remove("back-card");
}

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function onDraw() {
    const deckCards = Array.from(document.getElementById(constants.deck).children);
    if (!deckCards.length) {
        return;
    }

    const handElement = document.getElementById(constants.hand);
    const handCards = Array.from(handElement.children);
    let toDraw = handCards.length === 1 ? 5 : 1;

    for (let i = 0; i < toDraw; i++) {
        handElement.appendChild(deckCards[i]);
    }

    updateCountLabels();
}

function onShuffle() {
    const deck = document.getElementById(constants.deck);
    const cards = Array.from(deck.children);

    // Fisher-Yates Shuffle
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    deck.innerText = "";
    cards.forEach(c => deck.appendChild(c));
}

function onStartup() {
    createPlaceHolders();
}

let global = {
    deckData: {}
};

let constants = {
    imageUrl: "https://s3.duellinksmeta.com/cards/{0}_w420.webp",
    backgroundImage: "url('https://s3.duellinksmeta.com/cards/{0}_w420.webp') top left / cover no-repeat",
    getCardsByIdsUrl: "https://www.masterduelmeta.com/api/v1/cards?konamiID[$in]=",
    backCardImg: "url('resources/back-card.png') top left / cover no-repeat",
    extraDeckPlaceholder: "extra-deck-placeholder",
    deckPlaceholder: "deck-placeholder",
    extraDeckCounter: "extra-deck-counter",
    deckCounter: "deck-counter",
    graveCounter: "grave-counter",
    banishedCounter: "banished-counter",
    waitingTime: 1000,
    cardDetails: "card-details",
    cardDetailsImage: "card-details-image",
    cardDetailsDescription: "card-details-description",
    noDescription: "No card description",
    hand: "hand",
    deck: "deck",
    droppable: "droppable",
    scrollPlaceholder: "scroll-placeholder"
};

window.onload = onStartup;
window.ondragover = allowDrop;