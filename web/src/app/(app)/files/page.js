"use client";
import { useState } from "react";
import { useVault } from "@/context/VaultContext";
import FileList from "@/components/FileList";
import DeleteModal from "@/components/DeleteModal";
import PageTitle from "@/components/ui/PageTitle";

export default function MyFiles() {
  const { owned, loaded } = useVault();
  const [del, setDel] = useState(null);
  return (
    <div>
      <PageTitle title="My Files" />
      <FileList files={owned} mode="mine" onDelete={setDel} loading={!loaded} emptyTitle="You haven't uploaded any files yet" />
      {del && <DeleteModal file={del} onClose={() => setDel(null)} />}
    </div>
  );
}