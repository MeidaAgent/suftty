function makeElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text) {
    element.textContent = text;
  }
  return element;
}

async function fetchJsonCa(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("CA could not be loaded");
    }
    const { caAddress } = await response.json();
    return typeof caAddress === "string" && caAddress.trim()
      ? caAddress.trim()
      : null;
  } catch (error) {
    console.error("Error loading CA from " + url + ":", error);
    return null;
  }
}

// Primary: /api/ca (set via /developer). Fallback: /ca.json (edit in GitHub).
async function fetchCaAddress() {
  return (await fetchJsonCa("/api/ca")) || (await fetchJsonCa("/ca.json"));
}

function setupCopyAction(button, getText, statusElement, buttonTextElement) {
  if (!button) return;
  button.addEventListener("click", async () => {
    const text = typeof getText === "function" ? getText() : getText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (buttonTextElement) {
        const originalText = buttonTextElement.textContent;
        buttonTextElement.textContent = "✓ Tersalin!";
        buttonTextElement.style.color = "#9dc78a";
        setTimeout(() => {
          buttonTextElement.textContent = originalText;
          buttonTextElement.style.color = "";
        }, 2000);
      }
      if (statusElement) {
        statusElement.textContent = "Berhasil disalin ke clipboard.";
        setTimeout(() => {
          statusElement.textContent = "";
        }, 3000);
      }
    } catch {
      if (statusElement) {
        statusElement.textContent = "Gagal menyalin otomatis. Silakan salin manual.";
      }
    }
  });
}

function isValidContractAddress(addr) {
  if (!addr || typeof addr !== "string") return false;
  const clean = addr.trim();
  return clean.length >= 8 && clean !== "-" && clean !== "none";
}

function initHeroCa(caAddress) {
  const heroAddressEl = document.querySelector("#hero-ca-address");
  const heroCopyBtn = document.querySelector("#hero-ca-copy-btn");
  const heroBtnText = document.querySelector("#hero-ca-btn-text");
  const heroStatus = document.querySelector("#hero-ca-status");
  const dexLink = document.querySelector("#dex-link");
  const pumpLink = document.querySelector("#pump-link");

  if (!heroAddressEl) return;

  if (isValidContractAddress(caAddress)) {
    heroAddressEl.textContent = caAddress;
    if (heroCopyBtn) {
      heroCopyBtn.disabled = false;
      heroCopyBtn.style.cursor = "pointer";
      heroCopyBtn.style.opacity = "1";
    }

    if (dexLink) {
      dexLink.href = `https://dexscreener.com/search?q=${encodeURIComponent(caAddress)}`;
      dexLink.classList.remove("hidden");
    }

    if (pumpLink) {
      if (caAddress.endsWith("pump") || (caAddress.length >= 32 && !caAddress.startsWith("0x"))) {
        pumpLink.href = `https://pump.fun/${encodeURIComponent(caAddress)}`;
        pumpLink.classList.remove("hidden");
      }
    }

    setupCopyAction(heroCopyBtn, () => heroAddressEl.textContent, heroStatus, heroBtnText);
  } else {
    heroAddressEl.textContent = "CA belum diatur (atur di /developer)";
    if (heroCopyBtn) {
      heroCopyBtn.disabled = true;
      heroCopyBtn.style.cursor = "not-allowed";
      heroCopyBtn.style.opacity = "0.4";
    }
  }
}

function mountBottomCaSection(caAddress) {
  const footer = document.querySelector("footer");
  if (!footer || document.querySelector("#token-address-heading")) {
    return;
  }

  const valid = isValidContractAddress(caAddress);

  const section = makeElement("section", "hairline mt-16 sm:mt-24");
  section.setAttribute("aria-labelledby", "token-address-heading");
  const heading = makeElement(
    "h2",
    "text-[15px] font-medium leading-[24px] text-text",
    "Contract Address (CA)",
  );
  heading.id = "token-address-heading";
  section.append(
    heading,
    makeElement(
      "p",
      "mt-1.5 max-w-[470px] text-[12.5px] leading-[21px] text-muted",
      "Official Token Contract Address for SufTTY.",
    ),
  );

  const card = makeElement(
    "div",
    "mt-5 flex min-w-0 items-center gap-3 border border-border bg-panel px-3.5 py-3",
  );
  const addressElement = makeElement(
    "code",
    "min-w-0 flex-1 break-words text-[12px] text-text2",
    valid ? caAddress : "CA belum diatur",
  );
  addressElement.id = "ca-address";
  addressElement.setAttribute("aria-live", "polite");

  const copyButton = makeElement(
    "button",
    "shrink-0 border border-border-soft px-3 py-1.5 text-[11px] text-muted transition-colors hover:text-text",
    "Salin",
  );
  copyButton.type = "button";
  if (!valid) {
    copyButton.disabled = true;
    copyButton.style.cursor = "not-allowed";
    copyButton.style.opacity = "0.5";
  }

  const statusElement = makeElement("p", "mt-2 text-[11px] text-faint");
  statusElement.id = "ca-status";
  statusElement.setAttribute("role", "status");

  card.append(addressElement, copyButton);
  section.append(card, statusElement);
  footer.parentElement.insertBefore(section, footer);

  if (valid) {
    setupCopyAction(copyButton, () => addressElement.textContent, statusElement, copyButton);
  }
}

function enhanceInstallCopyButton() {
  const installCode = document.querySelector("div[role='tabpanel'] code");
  const installBtn = document.querySelector("div[role='tabpanel'] button");
  if (!installCode || !installBtn) return;

  installBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(installCode.textContent.trim());
      const originalHtml = installBtn.innerHTML;
      installBtn.innerHTML = `<span style="color:#9dc78a; font-size:11px; font-weight:600;">✓</span>`;
      setTimeout(() => {
        installBtn.innerHTML = originalHtml;
      }, 2000);
    } catch (e) {
      console.error(e);
    }
  });
}

async function init() {
  const caAddress = await fetchCaAddress();
  initHeroCa(caAddress);
  mountBottomCaSection(caAddress);
  enhanceInstallCopyButton();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
