"use client";
import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { useVault } from "@/context/VaultContext";
import { short, sameAddr } from "@/lib/utils";
import { notify } from "@/lib/notify";
import Button from "@/components/ui/Button";
import DataTable, { Stack } from "@/components/ui/DataTable";
import PageTitle from "@/components/ui/PageTitle";
import { inputCls } from "@/components/ui/styles";

export default function ManageUsers() {
  const { contract, account } = useWallet();
  const { users, loaded, refresh } = useVault();
  const [dept, setDept] = useState({});
  const [working, setWorking] = useState("");

  async function run(key, call, message) {
    setWorking(key);
    try {
      await (await call()).wait();
      await refresh();
      notify.success(message);
      return true;
    } catch (e) {
      notify.error(e);
      return false;
    } finally {
      setWorking("");
    }
  }

  const columns = [
    { key: "name", header: "Name", primary: true, title: (u) => u.name, render: (u) => <Stack title={u.name} /> },
    {
      key: "dept", header: "Department", width: "w-72", plain: true,
      render: (u) => {
        const edited = dept[u.wallet] !== undefined && dept[u.wallet].trim() !== u.department;
        return (
          <div className="flex gap-2">
            <input
              className={`${inputCls} min-w-0 flex-1`}
              aria-label={`Department for ${u.name}`}
              value={dept[u.wallet] ?? u.department}
              onChange={(e) => setDept({ ...dept, [u.wallet]: e.target.value })}
            />
            {edited && (
              <Button variant="secondary" disabled={!!working} loading={working === `d${u.wallet}`} loadingText="Saving"
                onClick={async () => {
                  if (await run(`d${u.wallet}`, () => contract.updateDepartment(u.wallet, dept[u.wallet].trim()), `${u.name}'s department was updated.`))
                    setDept((d) => { const n = { ...d }; delete n[u.wallet]; return n; });
                }}>
                Save
              </Button>
            )}
          </div>
        );
      },
    },
    {
      key: "role", header: "Role", width: "w-44", plain: true,
      render: (u) => (
        <select
          disabled={sameAddr(u.wallet, account) || !!working}
          className={`${inputCls} !w-full`}
          aria-label={`Role for ${u.name}`}
          value={Number(u.role)}
          onChange={(e) => run(`r${u.wallet}`, () => contract.updateRole(u.wallet, Number(e.target.value)), `${u.name}'s role was updated.`)}
        >
          <option value={1}>Employee</option>
          <option value={2}>Manager</option>
          <option value={3}>Admin</option>
        </select>
      ),
    },
    { key: "status", header: "Status", width: "w-28", render: (u) => <span className={u.active ? "text-ink" : "text-ink-3"}>{u.active ? "Active" : "Removed"}</span> },
    {
      key: "act", header: "", width: "w-32", align: "right", actions: true, plain: true,
      render: (u) => sameAddr(u.wallet, account) ? null : (
        <Button
          variant={u.active ? "dangerGhost" : "ghost"} size="sm" disabled={!!working}
          loading={working === `s${u.wallet}`} loadingText="Waiting"
          onClick={() => run(`s${u.wallet}`, () => contract.setUserActive(u.wallet, !u.active), u.active ? `${u.name} was removed.` : `${u.name} was restored.`)}
        >
          {u.active ? "Remove" : "Restore"}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageTitle title="Manage Users" />
      <DataTable columns={columns} rows={users} rowKey={(u) => u.wallet} loading={!loaded} pageSize={10} empty="No users yet" />
    </div>
  );
}