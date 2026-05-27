"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CsvExportButton } from "./csv-export-button";
import { QuestionType } from "@/domains/events/questions/validations";

interface Question {
  id: string;
  label: string;
  type: string;
}
interface Attendee {
  id: string;
  user: { id: string; name: string | null; email: string };
  responses: Array<{
    questionId: string;
    answer: string | null;
    fileUrl: string | null;
  }>;
}

interface ResponsesTableProps {
  questions: Question[];
  attendees: Attendee[];
  eventTitle: string;
}

export function ResponsesTable({
  questions,
  attendees,
  eventTitle,
}: ResponsesTableProps) {
  const responseMap = attendees.map((a) => ({
    name: a.user.name ?? a.user.email,
    email: a.user.email,
    responses: Object.fromEntries(
      a.responses.map((r) => [
        r.questionId,
        { answer: r.answer, fileUrl: r.fileUrl },
      ])
    ),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <CsvExportButton
          columns={questions.map((q) => ({
            id: q.id,
            label: q.label,
            type: q.type,
          }))}
          rows={responseMap}
          filename={`${eventTitle.toLowerCase().replace(/\s+/g, "-")}-responses.csv`}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="bg-background sticky left-0 min-w-[150px]">
                Attendee
              </TableHead>
              {questions.map((q) => (
                <TableHead key={q.id} className="min-w-[180px]">
                  {q.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={questions.length + 1}
                  className="text-muted-foreground py-8 text-center"
                >
                  No responses yet.
                </TableCell>
              </TableRow>
            ) : (
              attendees.map((attendee) => {
                const byQuestionId = Object.fromEntries(
                  attendee.responses.map((r) => [r.questionId, r])
                );

                return (
                  <TableRow key={attendee.id}>
                    <TableCell className="bg-background sticky left-0">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">
                          {attendee.user.name ?? "—"}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {attendee.user.email}
                        </span>
                      </div>
                    </TableCell>
                    {questions.map((q) => {
                      const r = byQuestionId[q.id];
                      if (!r)
                        return (
                          <TableCell
                            key={q.id}
                            className="text-muted-foreground"
                          >
                            —
                          </TableCell>
                        );

                      return (
                        <TableCell key={q.id}>
                          {q.type === QuestionType.YES_NO && (
                            <Badge
                              variant={
                                r.answer === "true" ? "default" : "secondary"
                              }
                            >
                              {r.answer === "true" ? "Yes" : "No"}
                            </Badge>
                          )}
                          {q.type === QuestionType.FILE_UPLOAD && r.fileUrl && (
                            <Button asChild variant="outline" size="sm">
                              <a
                                href={r.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View file
                              </a>
                            </Button>
                          )}
                          {(q.type === QuestionType.SHORT_TEXT ||
                            q.type === QuestionType.LONG_TEXT ||
                            q.type === QuestionType.MULTIPLE_CHOICE) && (
                            <span
                              className="line-clamp-2 text-sm"
                              title={r.answer ?? ""}
                            >
                              {r.answer ?? "—"}
                            </span>
                          )}
                          {!r.answer && !r.fileUrl && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
