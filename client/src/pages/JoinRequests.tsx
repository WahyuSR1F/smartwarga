import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function JoinRequests() {
  const { data: memberships } = trpc.community.organizations.useQuery();
  const activeOrg = memberships?.[0];

  const { data: requests, isLoading, refetch } = trpc.community.pendingJoinRequests.useQuery(
    { organizationId: activeOrg?.organization.id ?? "" },
    { enabled: Boolean(activeOrg) }
  );

  const reviewMutation = trpc.community.reviewJoinRequest.useMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.action === "approve" ? "Pengajuan disetujui ✅" : "Pengajuan ditolak");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (!activeOrg) {
    return (
      <div className="rounded-xl border border-[#dce8df] bg-white p-8 text-center">
        <p className="text-sm text-[#71827b]">Pilih wilayah terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#173b33]">Permintaan Join</h2>
        <p className="mt-1 text-sm text-[#71827b]">
          Kelola permintaan warga yang ingin bergabung ke {activeOrg.organization.name}.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-[#f0f4f1]" />
          ))}
        </div>
      ) : requests && requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map(req => (
            <div
              key={req.membership.userId}
              className="flex items-center justify-between rounded-xl border border-[#dce8df] bg-white px-5 py-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e4f0e8] text-sm font-bold text-[#34785e]">
                  {req.user.name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#173b33]">{req.user.name || "Tanpa nama"}</p>
                  <p className="mt-0.5 text-[11px] text-[#71827b]">{req.user.email}</p>
                  <p className="mt-0.5 text-[10px] text-[#a0b1a7]">
                    Diajukan: {req.membership.createdAt ? new Date(req.membership.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate({
                    organizationId: activeOrg.organization.id,
                    userId: req.membership.userId,
                    action: "reject",
                  })}
                  className="h-8 rounded-lg border-red-200 px-3 text-xs font-bold text-red-600 hover:bg-red-50"
                >
                  Tolak
                </Button>
                <Button
                  size="sm"
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate({
                    organizationId: activeOrg.organization.id,
                    userId: req.membership.userId,
                    action: "approve",
                  })}
                  className="h-8 rounded-lg bg-[#173b33] px-3 text-xs font-bold text-white hover:bg-[#255649]"
                >
                  Setujui
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[#dce8df] bg-white p-8 text-center">
          <p className="text-sm text-[#71827b]">Tidak ada permintaan join yang menunggu.</p>
        </div>
      )}
    </div>
  );
}
