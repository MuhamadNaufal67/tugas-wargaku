import { LETTER_HEAD_OFFICE, LETTER_SIGNATORIES } from "@/constants/templateSurat";
import { getLetterTemplateMeta } from "@/lib/pdf/generatePdf";

type LetterTemplatePreviewProps = {
  jenisSurat: string;
  nomorSurat: string;
};

export function LetterTemplatePreview({
  jenisSurat,
  nomorSurat,
}: LetterTemplatePreviewProps) {
  const meta = getLetterTemplateMeta(jenisSurat);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-200 pb-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-600">
          {LETTER_HEAD_OFFICE.logoLabel}
        </div>
        <div className="min-w-0 text-center flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-700">
            {LETTER_HEAD_OFFICE.regency}
          </p>
          <p className="text-sm font-extrabold uppercase text-slate-900">
            {LETTER_HEAD_OFFICE.district}
          </p>
          <p className="text-xs font-semibold uppercase text-slate-700">
            RT {LETTER_HEAD_OFFICE.rt} / RW {LETTER_HEAD_OFFICE.rw} • {LETTER_HEAD_OFFICE.subdistrict}
          </p>
          <p className="text-[11px] text-slate-500">{LETTER_HEAD_OFFICE.address}</p>
        </div>
      </div>

      <div className="py-4 text-center">
        <p className="text-base font-extrabold uppercase tracking-wide text-slate-950">
          {meta.fullTitle}
        </p>
        <p className="mt-1 text-xs text-slate-500">Nomor: {nomorSurat}</p>
      </div>

      <div className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
        <p className="font-semibold text-slate-900">{meta.shortTitle}</p>
        <p>{meta.description}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-center text-xs text-slate-500">
        <div className="rounded-lg border border-slate-200 px-3 py-3">
          <p className="font-semibold text-slate-700">Pemohon</p>
          <p className="mt-6 border-t border-dashed border-slate-300 pt-2 text-slate-400">
            Tanda tangan
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 px-3 py-3">
          <p className="font-semibold text-slate-700">{LETTER_SIGNATORIES.mainSignerRole}</p>
          <p className="mt-6 border-t border-dashed border-slate-300 pt-2 font-semibold text-slate-600">
            {LETTER_SIGNATORIES.mainSigner}
          </p>
        </div>
      </div>
    </div>
  );
}
