// ASCII Studio: right-click menu + toolbar button. Works in Chrome, Edge, Brave and Firefox.

const MENU_ID = "ascii-studio-open";

function createMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Turn into ASCII art",
      contexts: ["image", "video"],
    });
  });
}

chrome.runtime.onInstalled.addListener(createMenu);
chrome.runtime.onStartup.addListener(createMenu);

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID || !info.srcUrl) return;
  const url = new URL(chrome.runtime.getURL("studio.html"));
  url.searchParams.set("src", info.srcUrl);
  url.searchParams.set("type", info.mediaType === "video" ? "video" : "image");
  chrome.tabs.create({ url: url.href });
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("studio.html") });
});
