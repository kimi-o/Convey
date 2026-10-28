"use client";
import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { getContract, deployed } from "@/lib/contract";
import { deriveKeypair } from "@/lib/crypto";
import { getMetaMask, switchToVaultNetwork, walletError } from "@/lib/wallet";

const WalletCtx = createContext(null);

export const useWallet = () => {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider> (check src/app/layout.js)");
  return ctx;
};

/*
  status:
    idle | no-wallet | disconnected | wrong-network | no-contract
    | unregistered | revoked | needs-keys | ready
*/
const EMPTY = { account: null, signer: null, contract: null, profile: null, status: "idle", error: null };
const SIGNED_OUT_KEY = "convey-signed-out";

export function WalletProvider({ children }) {
  const [w, setW] = useState(EMPTY);
  const [keypair, setKeypair] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = useRef(0); // lets us ignore out-of-date connection attempts

  const connect = useCallback(async (silent = false) => {
    const id = ++run.current;
    const finish = (next) => {
      if (id !== run.current) return;
      setW({ ...EMPTY, ...next });
      setKeypair(null);
      setBusy(false);
      setReady(true);
    };

    const eth = getMetaMask();
    if (!eth) return finish({ status: "no-wallet" });

    // After "Sign out" don't silently reconnect until the user clicks Connect again
    try {
      if (silent && sessionStorage.getItem(SIGNED_OUT_KEY)) return finish({ status: "disconnected" });
      if (!silent) sessionStorage.removeItem(SIGNED_OUT_KEY);
    } catch {}

    setBusy(true);
    try {
      const accounts = await eth.request({ method: silent ? "eth_accounts" : "eth_requestAccounts" });
      if (!accounts?.length) return finish({ status: "disconnected" });
      const account = ethers.getAddress(accounts[0]);

      const chainId = parseInt(await eth.request({ method: "eth_chainId" }), 16);
      if (chainId !== deployed.chainId) return finish({ status: "wrong-network", account });

      const provider = new ethers.BrowserProvider(eth);
      if ((await provider.getCode(deployed.address)) === "0x") return finish({ status: "no-contract", account });

      const signer = await provider.getSigner();
      const contract = getContract(signer);
      const u = await contract.getUser(account);

      if (u.wallet === ethers.ZeroAddress) return finish({ status: "unregistered", account, signer, contract });
      if (!u.active) return finish({ status: "revoked", account, signer, contract });

      const hasKey = (u.encKey || "0x").length === 66;
      return finish({
        status: hasKey ? "ready" : "needs-keys",
        account, signer, contract,
        profile: { name: u.name, department: u.department, role: Number(u.role), encKey: u.encKey },
      });
    } catch (e) {
      return finish({ status: "disconnected", error: walletError(e) });
    }
  }, []);

  useEffect(() => {
    connect(true);
    const eth = getMetaMask();
    if (!eth?.on) return;
    const onAccounts = () => connect(true);
    const onChain = () => window.location.reload();
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener("accountsChanged", onAccounts);
      eth.removeListener("chainChanged", onChain);
    };
  }, [connect]);

  const switchNetwork = useCallback(async () => {
    const eth = getMetaMask();
    if (!eth) return;
    setBusy(true);
    try {
      await switchToVaultNetwork(eth);
      await connect(true);
    } catch (e) {
      setW((p) => ({ ...p, error: walletError(e) }));
      setBusy(false);
    }
  }, [connect]);

  const switchAccount = useCallback(async () => {
    const eth = getMetaMask();
    if (!eth) return;
    setBusy(true);
    try {
      await eth.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
      await connect(true);
    } catch (e) {
      setW((p) => ({ ...p, error: walletError(e) }));
      setBusy(false);
    }
  }, [connect]);

  const signOut = useCallback(async () => {
    const eth = getMetaMask();
    try { sessionStorage.setItem(SIGNED_OUT_KEY, "1"); } catch {}
    try { await eth?.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }); } catch {}
    run.current++;
    setW({ ...EMPTY, status: "disconnected" });
    setKeypair(null);
    setBusy(false);
  }, []);

  /** Derives the encryption keypair (one free signature) and registers the public key on-chain once */
  const unlockKeys = useCallback(async () => {
    let kp = keypair;
    if (!kp) { kp = await deriveKeypair(w.signer); setKeypair(kp); }
    const pub = ethers.hexlify(kp.publicKey);
    if ((w.profile?.encKey || "0x").toLowerCase() !== pub.toLowerCase()) {
      await (await w.contract.setEncryptionKey(pub)).wait();
      setW((p) => ({
        ...p,
        status: p.status === "needs-keys" ? "ready" : p.status,
        profile: { ...p.profile, encKey: pub },
      }));
    }
    return kp;
  }, [keypair, w.signer, w.contract, w.profile]);

  /** Used by the login screen for first-time key setup */
  const setupKeys = useCallback(async () => {
    setBusy(true);
    try {
      await unlockKeys();
    } catch (e) {
      setW((p) => ({ ...p, error: walletError(e) }));
    } finally {
      setBusy(false);
    }
  }, [unlockKeys]);

  return (
    <WalletCtx.Provider
      value={{ ...w, ready, busy, connect, switchNetwork, switchAccount, signOut, unlockKeys, setupKeys }}
    >
      {children}
    </WalletCtx.Provider>
  );
}