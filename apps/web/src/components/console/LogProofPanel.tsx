import { ExternalLink, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchUsageLogProof, type UsageLogProofResponse } from "../../api";
import { AlertBanner } from "./AlertBanner";
import { CodeBlock } from "./CodeBlock";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { useAuth } from "../../context/AuthContext";
import { contractExplorerUrl, formatDateTime, txExplorerUrl } from "../../lib/format";
import { verifyReceiptCli } from "../../lib/snippets";

interface LogProofPanelProps {
  logId: string;
  anchoringEnabled?: boolean;
  onClose: () => void;
}

function proofStatusTone(
  status: UsageLogProofResponse["status"],
): "success" | "warning" | "default" {
  if (status === "anchored") return "success";
  if (status === "pending") return "warning";
  return "default";
}

export function LogProofPanel({ logId, anchoringEnabled, onClose }: LogProofPanelProps) {
  const { apiKey } = useAuth();
  const [proof, setProof] = useState<UsageLogProofResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchUsageLogProof(apiKey!, logId);
        if (!cancelled) setProof(res);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load proof");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [apiKey, logId]);

  return (
    <Card accent="primary" className="relative">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" strokeWidth={1.75} />
          <div>
            <p className="text-label-sm text-primary">Receipt proof</p>
            <p className="text-mono-sm text-on-surface-muted">{logId}</p>
          </div>
        </div>
        <Button type="button" variant="tertiary" size="sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </div>

      {loading && (
        <p className="mt-4 text-body-sm text-on-surface-muted">Loading proof data…</p>
      )}

      {error && (
        <div className="mt-4">
          <AlertBanner tone="error">{error}</AlertBanner>
        </div>
      )}

      {proof && !loading && (
        <div className="mt-4 space-y-4">
          {proof.anchoring_enabled === false && proof.status === "pending" && (
            <AlertBanner tone="info">
              Receipt hash is recorded. On-chain Merkle anchoring is not enabled on this
              deployment yet — proofs will be available once the anchor contract is configured.
            </AlertBanner>
          )}

          {anchoringEnabled === false && proof.anchoring_enabled === undefined && (
            <AlertBanner tone="info">
              On-chain anchoring is not enabled on this deployment. Receipt metadata is still
              available below.
            </AlertBanner>
          )}

          <div className="flex flex-wrap gap-2">
            <Chip tone={proofStatusTone(proof.status)}>{proof.status}</Chip>
            {proof.receipt_version && (
              <Chip tone="default">{proof.receipt_version}</Chip>
            )}
          </div>

          {proof.status === "pending" && proof.anchoring_enabled !== false && (
            <p className="text-body-sm text-on-surface-muted">
              Receipt computed. Waiting for the next Merkle batch to anchor on-chain.
            </p>
          )}

          {proof.status === "no_receipt" && (
            <p className="text-body-sm text-on-surface-muted">
              This request predates receipt hashing or was not eligible for anchoring.
            </p>
          )}

          {proof.receipt_hash && (
            <div>
              <p className="text-label-sm text-on-surface-muted">Receipt hash</p>
              <code className="mt-1 block break-all text-mono-sm text-on-surface">
                {proof.receipt_hash}
              </code>
            </div>
          )}

          {proof.merkle_root && (
            <div>
              <p className="text-label-sm text-on-surface-muted">Merkle root</p>
              <code className="mt-1 block break-all text-mono-sm text-on-surface">
                {proof.merkle_root}
              </code>
            </div>
          )}

          {proof.anchor && (
            <div className="rounded-md border border-border bg-background p-4">
              <p className="text-label-sm text-on-surface">On-chain anchor</p>
              <dl className="mt-3 space-y-2 text-body-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-muted">Anchored</dt>
                  <dd>{formatDateTime(proof.anchor.anchored_at)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-muted">Chain</dt>
                  <dd>{proof.anchor.chain_id}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-muted">Tx</dt>
                  <dd>
                    <a
                      href={txExplorerUrl(
                        proof.anchor.chain_id === 84532 ? "base-sepolia" : "base",
                        proof.anchor.tx_hash,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:text-primary-hover"
                    >
                      {proof.anchor.tx_hash.slice(0, 10)}…
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </a>
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-muted">Contract</dt>
                  <dd>
                    <a
                      href={contractExplorerUrl(
                        proof.anchor.chain_id,
                        proof.anchor.contract_address,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:text-primary-hover"
                    >
                      {proof.anchor.contract_address.slice(0, 10)}…
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {proof.receipt && (
            <CodeBlock
              label="Receipt payload"
              code={JSON.stringify(proof.receipt, null, 2)}
            />
          )}

          {proof.merkle_proof && proof.merkle_proof.length > 0 && (
            <CodeBlock
              label="Merkle proof"
              code={JSON.stringify(proof.merkle_proof, null, 2)}
            />
          )}

          <div>
            <p className="text-body-sm text-on-surface-muted">
              Verify locally with the CLI (requires API access to this log):
            </p>
            <div className="mt-2">
              <CodeBlock code={verifyReceiptCli(logId)} />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
