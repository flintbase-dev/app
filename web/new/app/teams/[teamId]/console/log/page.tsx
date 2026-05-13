import { SearchX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { loadTeamLogs } from "@/lib/console/data";
import { fmtMoney, fmtRelative } from "@/lib/console/format";

export default async function TeamUsagePage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { teamId } = await params;
  const { p = "1" } = await searchParams;
  const page = Math.max(Number(p) || 1, 1);
  const logs = await loadTeamLogs(teamId, { p: page });
  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <div>
          <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
            Team · usage
          </p>
          <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
            Usage logs
          </h1>
        </div>
        <Card className="mt-6 overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Group</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Request</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <Empty className="border-0 py-12">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <SearchX aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>No Team usage</EmptyTitle>
                        <EmptyDescription>
                          Requests made with Team API keys will appear here.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : null}
              {logs.items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.ts ? fmtRelative(log.ts) : "new"}
                  </TableCell>
                  <TableCell>
                    <code className="font-mono text-sm">{log.model}</code>
                  </TableCell>
                  <TableCell>{log.tokenName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.group}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {fmtMoney(log.cost, logs.status)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.status === "ok" ? "secondary" : "destructive"
                      }
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="font-mono text-xs text-muted-foreground">
                      {log.requestId}
                    </code>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
