"use client";
import { useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/context/WalletContext";
import { useVault } from "@/context/VaultContext";
import { notify } from "@/lib/notify";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import { inputCls, labelCls } from "@/components/ui/styles";

const EMPTY = { wallet: "", name: "", department: "", role: 1 };

export default function AddUsers() {
  const { contract } = useWallet();
  const { refresh } = useVault();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const wallet = form.wallet.trim();
    if (!ethers.isAddress(wallet)) return notify.error("That wallet address isn't valid.");
    setBusy(true);
    try {
      await (await contract.registerUser(wallet, form.name.trim(), form.department.trim(), Number(form.role))).wait();
      await refresh();
      notify.success(`${form.name.trim()} was added.`);
      setForm(EMPTY);
    } catch (err) {
      notify.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageTitle title="Add Users" />
      <form onSubmit={submit} className="grid gap-5 border border-white/10 bg-card p-5 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelCls}>Wallet address</span>
          <input required className={inputCls} placeholder="0x…" value={form.wallet} onChange={set("wallet")} />
        </label>
        <label className="block">
          <span className={labelCls}>Full name</span>
          <input required className={inputCls} value={form.name} onChange={set("name")} />
        </label>
        <label className="block">
          <span className={labelCls}>Department</span>
          <input required className={inputCls} value={form.department} onChange={set("department")} />
        </label>
        <label className="block">
          <span className={labelCls}>Role</span>
          <select className={inputCls} value={form.role} onChange={set("role")}>
            <option value={1}>Employee</option>
            <option value={2}>Manager</option>
            <option value={3}>Admin</option>
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" className="w-full" loading={busy} loadingText="Waiting for blockchain…">Add user</Button>
        </div>
      </form>
    </div>
  );
}