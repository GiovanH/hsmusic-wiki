// This is the JS file that gets loaded on the client! It's only really used for
// the random track feature right now - the idea is we only use it for stuff
// that cannot 8e done at static-site compile time, 8y its fundamentally
// ephemeral nature.
//
// Upd8: As of 04/02/2021, it's now used for info cards too! Nice.

'use strict';

let albumData, artistData, flashData;
let officialAlbumData, fandomAlbumData, artistNames;

let ready = false;

// Miscellaneous helpers ----------------------------------

function rebase(href, rebaseKey = 'rebaseLocalized') {
    const relative = document.documentElement.dataset[rebaseKey] + '/';
    if (relative) {
        return relative + href;
    } else {
        return href;
    }
}

function pick(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function cssProp(el, key) {
    return getComputedStyle(el).getPropertyValue(key).trim();
}

function getRefDirectory(ref) {
    return ref.split(':')[1];
}

function getAlbum(el) {
    const directory = cssProp(el, '--album-directory');
    return albumData.find(album => album.directory === directory);
}

function getFlash(el) {
    const directory = cssProp(el, '--flash-directory');
    return flashData.find(flash => flash.directory === directory);
}

// TODO: These should pro8a8ly access some shared urlSpec path. We'd need to
// separ8te the tooling around that into common-shared code too.
const getLinkHref = (type, directory) => rebase(`${type}/${directory}`);
const openAlbum = d => rebase(`album/${d}`);
const openTrack = d => rebase(`track/${d}`);
const openArtist = d => rebase(`artist/${d}`);
const openFlash = d => rebase(`flash/${d}`);

function getTrackListAndIndex() {
    const album = getAlbum(document.body);
    const directory = cssProp(document.body, '--track-directory');
    if (!directory && !album) return {};
    if (!directory) return {list: album.tracks};
    const trackIndex = album.tracks.findIndex(track => track.directory === directory);
    return {list: album.tracks, index: trackIndex};
}

function openRandomTrack() {
    const { list } = getTrackListAndIndex();
    if (!list) return;
    return openTrack(pick(list));
}

function getFlashListAndIndex() {
    const list = flashData.filter(flash => !flash.act8r8k)
    const flash = getFlash(document.body);
    if (!flash) return {list};
    const flashIndex = list.indexOf(flash);
    return {list, index: flashIndex};
}

// TODO: This should also use urlSpec.
function fetchData(type, directory) {
    return fetch(rebase(`${type}/${directory}/data.json`, 'rebaseData'))
        .then(res => res.json());
}

// JS-based links -----------------------------------------

for (const a of document.body.querySelectorAll('[data-random]')) {
    a.addEventListener('click', evt => {
        if (!ready) {
            evt.preventDefault();
            return;
        }

        setTimeout(() => {
            a.href = rebase('js-disabled');
        });
        switch (a.dataset.random) {
            case 'album': return a.href = openAlbum(pick(albumData).directory);
            case 'album-in-fandom': return a.href = openAlbum(pick(fandomAlbumData).directory);
            case 'album-in-official': return a.href = openAlbum(pick(officialAlbumData).directory);
            case 'track': return a.href = openTrack(getRefDirectory(pick(albumData.map(a => a.tracks).reduce((a, b) => a.concat(b), []))));
            case 'track-in-album': return a.href = openTrack(getRefDirectory(pick(getAlbum(a).tracks)));
            case 'track-in-fandom': return a.href = openTrack(getRefDirectory(pick(fandomAlbumData.reduce((acc, album) => acc.concat(album.tracks), []))));
            case 'track-in-official': return a.href = openTrack(getRefDirectory(pick(officialAlbumData.reduce((acc, album) => acc.concat(album.tracks), []))));
            case 'artist': return a.href = openArtist(pick(artistData).directory);
            case 'artist-more-than-one-contrib': return a.href = openArtist(pick(artistData.filter(artist => C.getArtistNumContributions(artist) > 1)).directory);
        }
    });
}

const next = document.getElementById('next-button');
const previous = document.getElementById('previous-button');
const random = document.getElementById('random-button');

const prependTitle = (el, prepend) => {
    const existing = el.getAttribute('title');
    if (existing) {
        el.setAttribute('title', prepend + ' ' + existing);
    } else {
        el.setAttribute('title', prepend);
    }
};

if (next) prependTitle(next, '(Shift+N)');
if (previous) prependTitle(previous, '(Shift+P)');
if (random) prependTitle(random, '(Shift+R)');

document.addEventListener('keypress', event => {
    if (event.shiftKey) {
        if (event.charCode === 'N'.charCodeAt(0)) {
            if (next) next.click();
        } else if (event.charCode === 'P'.charCodeAt(0)) {
            if (previous) previous.click();
        } else if (event.charCode === 'R'.charCodeAt(0)) {
            if (random && ready) random.click();
        }
    }
});

for (const reveal of document.querySelectorAll('.reveal')) {
    reveal.addEventListener('click', event => {
        if (!reveal.classList.contains('revealed')) {
            reveal.classList.add('revealed');
            event.preventDefault();
            event.stopPropagation();
        }
    });
}

const elements1 = document.getElementsByClassName('js-hide-once-data');
const elements2 = document.getElementsByClassName('js-show-once-data');

for (const element of elements1) element.style.display = 'block';

fetch(rebase('data.json', 'rebaseShared')).then(data => data.json()).then(data => {
    albumData = data.albumData;
    artistData = data.artistData;
    flashData = data.flashData;

    officialAlbumData = albumData.filter(album => album.groups.includes('group:official'));
    fandomAlbumData = albumData.filter(album => !album.groups.includes('group:official'));
    artistNames = artistData.filter(artist => !artist.alias).map(artist => artist.name);

    for (const element of elements1) element.style.display = 'none';
    for (const element of elements2) element.style.display = 'block';

    ready = true;
});

// Data & info card ---------------------------------------

const NORMAL_HOVER_INFO_DELAY = 750;
const FAST_HOVER_INFO_DELAY = 250;
const END_FAST_HOVER_DELAY = 500;
const HIDE_HOVER_DELAY = 250;

let fastHover = false;
let endFastHoverTimeout = null;

function link(a, type, {name, directory, color}) {
    if (color) {
        a.style.setProperty('--primary-color', color);
    }

    a.innerText = name
    a.href = getLinkHref(type, directory);
}

const infoCard = (() => {
    const container = document.getElementById('info-card-container');

    let cancelShow = false;
    let hideTimeout = null;

    container.addEventListener('mouseenter', cancelHide);
    container.addEventListener('mouseleave', readyHide);

    function show(type, target) {
        cancelShow = false;

        fetchData(type, target.dataset[type]).then(data => {
            // Manual DOM 'cuz we're laaaazy.

            if (cancelShow) {
                return;
            }

            const rect = target.getBoundingClientRect();

            container.style.setProperty('--primary-color', data.color);

            container.style.top = window.scrollY + rect.bottom + 'px';
            container.style.left = window.scrollX + rect.left + 'px';

            // Use a short timeout to let a currently hidden (or not yet shown)
            // info card teleport to the position set a8ove. (If it's currently
            // shown, it'll transition to that position.)
            setTimeout(() => {
                container.classList.remove('hide');
                container.classList.add('show');
            }, 50);

            const nameLink = container.querySelector('.info-card-name a');
            link(nameLink, 'track', data);

            const albumLink = container.querySelector('.info-card-album a');
            link(albumLink, 'album', data.links.album);

            const img = container.querySelector('.info-card-art');
            img.src = rebase(data.cover.path, 'rebaseMedia');
        });
    }

    function hide() {
        container.classList.remove('show');
        container.classList.add('hide');
        cancelShow = true;
    }

    function readyHide() {
        if (!hideTimeout) {
            hideTimeout = setTimeout(hide, HIDE_HOVER_DELAY);
        }
    }

    function cancelHide() {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
    }

    return {
        show,
        hide,
        readyHide,
        cancelHide
    };
})();

function makeInfoCardLinkHandlers(type) {
    let hoverTimeout = null;

    return {
        mouseenter(evt) {
            hoverTimeout = setTimeout(() => {
                fastHover = true;
                infoCard.show(type, evt.target);
            }, fastHover ? FAST_HOVER_INFO_DELAY : NORMAL_HOVER_INFO_DELAY);

            clearTimeout(endFastHoverTimeout);
            endFastHoverTimeout = null;

            infoCard.cancelHide();
        },

        mouseleave(evt) {
            clearTimeout(hoverTimeout);

            if (fastHover && !endFastHoverTimeout) {
                endFastHoverTimeout = setTimeout(() => {
                    endFastHoverTimeout = null;
                    fastHover = false;
                }, END_FAST_HOVER_DELAY);
            }

            infoCard.readyHide();
        }
    };
}

const infoCardLinkHandlers = {
    track: makeInfoCardLinkHandlers('track')
};

function addInfoCardLinkHandlers(type) {
    for (const a of document.querySelectorAll(`a[data-${type}]`)) {
        for (const [ eventName, handler ] of Object.entries(infoCardLinkHandlers[type])) {
            a.addEventListener(eventName, handler);
        }
    }
}

addInfoCardLinkHandlers('track');
