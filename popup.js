document.addEventListener("DOMContentLoaded", async () => {
  const tabList = document.getElementById("tabList");
  const searchInput = document.getElementById("searchInput");
  const focusScore = document.getElementById("focusScore");

  // Dummy focus score (later AI-driven)
  focusScore.textContent = Math.floor(Math.random() * 40) + 60 + "/100";

  // Get tabs
  let [currentWindow] = await chrome.windows.getAll({ populate: true });
  let tabs = currentWindow.tabs;

  function renderTabs(filter = "") {
    tabList.innerHTML = "";
    tabs
      .filter(tab => tab.title.toLowerCase().includes(filter.toLowerCase()))
      .forEach(tab => {
        let div = document.createElement("div");
        div.className =
          "flex items-center bg-white p-2 rounded-lg shadow hover:bg-gray-50";
        div.innerHTML = `
          <img src="${tab.favIconUrl || "https://www.google.com/favicon.ico"}" class="w-4 h-4 mr-2">
          <span class="flex-1 text-sm truncate">${tab.title}</span>
          <button class="text-red-500 text-xs ml-2">✖</button>
        `;
        div.querySelector("button").addEventListener("click", () => {
          chrome.tabs.remove(tab.id);
          div.remove();
        });
        tabList.appendChild(div);
      });
  }

  renderTabs();

  // Search filter
  searchInput.addEventListener("input", (e) => {
    renderTabs(e.target.value);
  });

  // Focus Mode Button (basic: keep only 3 recent tabs)
  document.getElementById("focusBtn").addEventListener("click", async () => {
    let toClose = tabs.slice(3); // close all except top 3
    for (let tab of toClose) {
      chrome.tabs.remove(tab.id);
    }
    alert("Focus Mode Enabled! Only your top 3 tabs are kept.");
  });
});
