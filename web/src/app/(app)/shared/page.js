"use client";
import { useState } from "react";
import { useVault } from "@/context/VaultContext";
import FileList from "@/components/FileList";
import DeleteModal from "@/components/DeleteModal";
import PageTitle from "@/components/ui/PageTitle";

export default function Shared() {
  const { shared, sentAt, loaded } = useVault();
  const [del, setDel] = useState(null);
  return (
    <div>
      <PageTitle title="Shared with me" />
      <FileList
        files={shared}
        mode="shared"
        onDelete={setDel}
        loading={!loaded}
        timeOf={(f) => sentAt[f.id] || f.createdAt}
        emptyTitle="Nothing has been shared with you yet"
      />
      {del && <DeleteModal file={del} onClose={() => setDel(null)} />}
    </div>
  );
}