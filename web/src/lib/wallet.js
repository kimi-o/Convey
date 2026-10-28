import { deployed } from "@/lib/contract";

const toHex = (n) => "0x" + Number(n).toString(16);

// Used only if MetaMask doesn't know the network yet
const CHAINS = {
  31337: {
    chainName: "Hardhat Local",
    rpcUrls: ["http://127.0.0.1:8545"],
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  11155111: {
    chainName: "Sepolia",
    rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },
};

/** Returns the injected wallet (prefers MetaMask if several wallets are installed) */
export function getMetaMask() {
  if (typeof window === "undefined" || !window.ethereum) return null;
  const eth = window.ethereum;
  if (Array.isArray(eth.providers)) return eth.providers.find((p) => p.isMetaMask) || eth.providers[0] || null;
  return eth;
}

/** Switches MetaMask to the vault's network, adding it first if MetaMask doesn't have it */
export async function switchToVaultNetwork(eth) {
  const chainId = toHex(deployed.chainId);
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch (err) {
    const code = err?.code ?? err?.data?.originalError?.code;
    if (code === 4902 && CHAINS[deployed.chainId]) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{ chainId, ...CHAINS[deployed.chainId] }],
      });
    } else {
      throw err;
    }
  }
}

/** Turns any wallet/network error into { text, mark }. `mark` is the part shown in red. */
export function walletError(e) {
  const code = e?.code ?? e?.error?.code ?? e?.info?.error?.code;
  const msg = String(e?.message || "");

  if (code === 4001 || code === "ACTION_REJECTED" || /user rejected|user denied/i.test(msg))
    return { text: "The request was cancelled in MetaMask. Please try again.", mark: "cancelled" };

  if (code === -32002)
    return { text: "A MetaMask request is already open. Open the extension to continue.", mark: "already open" };

  if (code === "NETWORK_ERROR" || code === "SERVER_ERROR" || code === -32603 || /failed to fetch|could not detect network|network error/i.test(msg))
    return { text: "The blockchain network can't be reached. Make sure it is running.", mark: "can't be reached" };

  if (code === "BAD_DATA" || code === "CALL_EXCEPTION")
    return { text: "The vault contract could not be read. Make sure it is deployed.", mark: "could not be read" };

  return { text: "Something went wrong while connecting. Please try again.", mark: "went wrong" };
}