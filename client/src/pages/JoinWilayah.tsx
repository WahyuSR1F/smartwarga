import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function JoinWilayah() {
  const { data: myOrgs, refetch: refetchMyOrgs } = trpc.community.organizations.useQuery();
  const { data: allOrgs, isLoading } = trpc.publicContent.listOrganizations.useQuery();
  const joinMutation = trpc.community.joinRequest.useMutation({
    onSuccess: () => {
      toast.success("Pengajuan join berhasil! Menunggu persetujuan admin.");
      refetchMyOrgs();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const myOrgIds = new Set(myOrgs?.map(m => m.organization.id) ?? []);

  const availableOrgs = allOrgs?.filter(org => {
    // Cek apakah user sudah aktif di org ini
    const myMembership = myOrgs?.find(m => m.organization.id === org.id);
    return !myMembership || myMembership.membership.status !== "active";
  }) ?? [];

  const pendingOrgIds = new Set(
    myOrgs?.filter(m => m.membership.status === "pending").map(m => m.organization.id) ?? []
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#173b33]">Gabung Wilayah Baru</h2>
        <p className="mt-1 text-sm text-[#71827b]">
          Ajukan permintaan untuk bergabung ke RT/RW lain. Menunggu persetujuan admin.
        </p>
      </div>

      {/* Wilayah yang sudah diikuti */}
      {myOrgs && myOrgs.length > 0 && (
        <div className="rounded-xl border border-[#dce8df] bg-white p-4">
          <h3 className="text-sm font-bold text-[#345b4e]">Wilayah yang diikuti</h3>
          <div className="mt-3 space-y-2">
            {myOrgs.map(m => (
              <div key={m.organization.id} className="flex items-center justify-between rounded-lg border border-[#e6efe8] bg-[#f8fbf9] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#173b33]">{m.organization.name}</p>
                  <p className="mt-0.5 text-[11px] text-[#71827b]">
                    {m.membership.status === "active" ? "✅ Aktif" : "⏳ Menunggu persetujuan"}
                  </p>
                </div>
                {m.membership.status === "pending" && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-700">
                    Pending
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daftar wilayah yang bisa dijoin */}
      <div className="rounded-xl border border-[#dce8df] bg-white p-4">
        <h3 className="text-sm font-bold text-[#345b4e]">Wilayah tersedia</h3>
        {isLoading ? (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-[#f0f4f1]" />
            ))}
          </div>
        ) : availableOrgs.length > 0 ? (
          <div className="mt-3 space-y-2">
            {availableOrgs.map(org => {
              const isPending = pendingOrgIds.has(org.id);
              return (
                <div key={org.id} className="flex items-center justify-between rounded-lg border border-[#e6efe8] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#173b33]">{org.name}</p>
                    {org.description && (
                      <p className="mt-0.5 text-[11px] text-[#71827b]">{org.description}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    disabled={isPending || joinMutation.isPending}
                    onClick={() => joinMutation.mutate({ organizationId: org.id })}
                    className={`h-8 rounded-lg px-4 text-xs font-bold ${
                      isPending
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                        : "bg-[#173b33] text-white hover:bg-[#255649]"
                    }`}
                  >
                    {isPending ? "Diajukan" : "Ajukan Join"}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-[#e6efe8] bg-[#f8fbf9] p-4 text-center">
            <p className="text-sm text-[#71827b]">Semua wilayah sudah diikuti atau tidak ada yang tersedia.</p>
          </div>
        )}
      </div>
    </div>
  );
}
