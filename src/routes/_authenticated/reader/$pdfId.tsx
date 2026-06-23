import { createFileRoute } from "@tanstack/react-router";
import { PdfReader } from "@/components/pdf/PdfReader";

export const Route = createFileRoute("/_authenticated/reader/$pdfId")({
  head: () => ({ meta: [{ title: "Reading · SmartPDF" }] }),
  component: ReaderPage,
});

function ReaderPage() {
  const { pdfId } = Route.useParams();
  return <PdfReader pdfId={pdfId} />;
}
