const PARC_TOKEN = {
  address: "0x4A7CB744EE8f1B656A20940B80b368d5d8172875",
  symbol: "PARC",
  decimals: 18,
  image: "https://renrrs1-lab.github.io/PartnershipCoin/parc-logo-32.svg"
};

const BSC_CHAIN = {
  chainId: "0x38",
  chainName: "BNB Smart Chain",
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18
  },
  rpcUrls: ["https://bsc-dataseed.binance.org/"],
  blockExplorerUrls: ["https://bscscan.com"]
};

const PAIR_ADDRESS = "0xf517f5c05b1214bd35e30bc03b2921e5230c93b5";
const DONATION_WALLET = "0xfDcAbb9647602cdd50dFAF458c9cB91114fff358";
const METAMASK_MOBILE_DAPP = "https://metamask.app.link/dapp/renrrs1-lab.github.io/PartnershipCoin/";
let lastProviderDetection = {
  braveWalletDetected: false,
  injectedProviderDetected: false
};

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isLocalFilePage() {
  return window.location.protocol === "file:";
}

function setWalletStatus(message, type = "info") {
  const status = document.getElementById("wallet-status");
  if (!status) return;
  status.innerText = message;
  status.dataset.type = type;
}

function selectText(element) {
  if (!element) return;
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
}

async function copyText(value, statusElement, successMessage, fallbackElement) {
  try {
    await navigator.clipboard.writeText(value);
    if (statusElement) statusElement.innerText = successMessage;
    return true;
  } catch (error) {
    selectText(fallbackElement);
    if (statusElement) statusElement.innerText = "Text selected. Press Ctrl+C to copy.";
    return false;
  }
}

async function copyContract() {
  await copyText(
    PARC_TOKEN.address,
    document.getElementById("wallet-status"),
    "Contract copied.",
    document.getElementById("manualContract")
  );
}

function isMetaMaskProvider(provider) {
  return Boolean(provider && provider.isMetaMask === true && provider.isBraveWallet !== true);
}

function isBraveProvider(provider) {
  return Boolean(provider && provider.isBraveWallet === true);
}

async function discoverEip6963Providers(timeoutMs = 500) {
  return new Promise((resolve) => {
    const providers = [];

    function onProvider(event) {
      if (event.detail && event.detail.provider) {
        providers.push(event.detail);
      }
    }

    window.addEventListener("eip6963:announceProvider", onProvider);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    window.setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onProvider);
      resolve(providers);
    }, timeoutMs);
  });
}

async function getMetaMaskProvider() {
  lastProviderDetection = {
    braveWalletDetected: false,
    injectedProviderDetected: Boolean(window.ethereum)
  };

  const announcedProviders = await discoverEip6963Providers();
  const announcedMetaMask = announcedProviders.find(({ info, provider }) => {
    const rdns = String(info?.rdns || "").toLowerCase();
    const name = String(info?.name || "").toLowerCase();

    if (isBraveProvider(provider) || rdns.includes("brave")) {
      lastProviderDetection.braveWalletDetected = true;
      return false;
    }

    return rdns === "io.metamask" || name.includes("metamask");
  });

  if (announcedMetaMask?.provider) {
    return announcedMetaMask.provider;
  }

  if (Array.isArray(window.ethereum?.providers)) {
    const providers = window.ethereum.providers;
    lastProviderDetection.braveWalletDetected = providers.some(isBraveProvider);

    const legacyMetaMask = providers.find(isMetaMaskProvider);
    if (legacyMetaMask) {
      return legacyMetaMask;
    }
  }

  if (isBraveProvider(window.ethereum)) {
    lastProviderDetection.braveWalletDetected = true;
    return null;
  }

  if (isMetaMaskProvider(window.ethereum)) {
    return window.ethereum;
  }

  return null;
}

async function switchToBnbSmartChain(provider) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_CHAIN.chainId }]
    });
  } catch (error) {
    if (error && error.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [BSC_CHAIN]
      });
      return;
    }

    throw error;
  }
}

async function addParcToMetaMask() {
  setWalletStatus("Detecting MetaMask...");

  const provider = await getMetaMaskProvider();

  if (!provider) {
    if (isLocalFilePage()) {
      setWalletStatus(
        "MetaMask was not detected because this page is open as a local file. Test with http://localhost:8787/ or the GitHub Pages URL, or enable MetaMask access to file URLs in Chrome extension settings.",
        "warning"
      );
      return;
    }

    if (isMobileDevice()) {
      setWalletStatus(
        "On mobile, open this website inside MetaMask Mobile browser, then tap Add PARC to MetaMask again.",
        "warning"
      );
      window.location.href = METAMASK_MOBILE_DAPP;
      return;
    }

    if (lastProviderDetection.braveWalletDetected) {
      setWalletStatus(
        "Brave Wallet was detected, but this button is configured for MetaMask. Please select MetaMask or disable Brave Wallet injection for this site.",
        "warning"
      );
      return;
    }

    setWalletStatus(
      "MetaMask was not detected. Make sure the MetaMask extension is installed, unlocked and enabled for this site.",
      "warning"
    );
    return;
  }

  try {
    await provider.request({
      method: "eth_requestAccounts"
    });

    setWalletStatus("Switching to BNB Smart Chain...");
    await switchToBnbSmartChain(provider);

    setWalletStatus("Adding PARC token...");
    const wasAdded = await provider.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: PARC_TOKEN
      }
    });

    if (wasAdded) {
      setWalletStatus("PARC was added to MetaMask successfully.", "success");
    } else {
      setWalletStatus("Request cancelled. You can add PARC manually using the contract address.", "warning");
    }
  } catch (error) {
    if (error && error.code === 4001) {
      setWalletStatus("Request cancelled. You can add PARC manually using the contract address.", "warning");
      return;
    }

    if (error && error.code === -32002) {
      setWalletStatus("MetaMask already has a pending request. Please open MetaMask to continue.", "warning");
      return;
    }

    setWalletStatus("Could not add PARC automatically. You can add PARC manually using the contract address.", "warning");
    console.error("Add PARC to MetaMask failed:", error);
  }
}

function formatUsd(value, decimals = 8) {
  if (!value) return "N/A";
  const number = Number(value);
  if (number >= 1) {
    return "$" + number.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  return "$" + number.toFixed(decimals);
}

function formatUsdCompact(value) {
  if (!value) return "N/A";
  return "$" + Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 2
  });
}

async function loadDexData() {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/pairs/bsc/${PAIR_ADDRESS}`);
    const data = await response.json();
    const pair = data.pair;

    if (!pair) {
      document.getElementById("price").innerText = "Not available yet";
      document.getElementById("marketCap").innerText = "N/A";
      document.getElementById("liquidity").innerText = "N/A";
      document.getElementById("volume24h").innerText = "N/A";
      return;
    }

    document.getElementById("price").innerText = pair.priceUsd ? formatUsd(pair.priceUsd) : "N/A";
    document.getElementById("marketCap").innerText = pair.marketCap ? formatUsdCompact(pair.marketCap) : "N/A";
    document.getElementById("liquidity").innerText = pair.liquidity?.usd ? formatUsdCompact(pair.liquidity.usd) : "N/A";
    document.getElementById("volume24h").innerText = pair.volume?.h24 ? formatUsdCompact(pair.volume.h24) : "N/A";
  } catch (error) {
    console.error(error);
    document.getElementById("price").innerText = "Error loading data";
  }
}

async function copyDonationWallet() {
  await copyText(
    DONATION_WALLET,
    document.getElementById("copyStatus"),
    "Donation wallet copied.",
    document.getElementById("donationWallet")
  );
}

document.getElementById("addParcButton")?.addEventListener("click", addParcToMetaMask);
document.getElementById("appAddParcButton")?.addEventListener("click", addParcToMetaMask);
document.getElementById("copyContractButton")?.addEventListener("click", copyContract);
document.getElementById("copyDonationWallet")?.addEventListener("click", copyDonationWallet);

loadDexData();
setInterval(loadDexData, 60000);
