const PARTNER_BANKS = ['CBE', 'Dashen', 'Awash', 'CBO', 'Abyssinia', 'OIB'];

/**
 * The partner-bank strip under every sign-in form. Three near-identical copies
 * of this markup had drifted apart (label casing, pill colours, spacing) — a
 * difference nobody sees on one page and everybody sees moving between them.
 */
export function PartnerBanks() {
  return (
    <div className="mt-8 w-full flex flex-col items-center">
      <span className="text-[12px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-3">
        Partner Banks
      </span>
      <div className="flex flex-wrap justify-center gap-1.5">
        {PARTNER_BANKS.map((bank) => (
          <span
            key={bank}
            className="px-4 py-1.5 rounded-full border border-[#16A34A]/30 text-[11px] font-bold text-[#16A34A] cursor-default bg-[#F7FFFB]"
          >
            {bank}
          </span>
        ))}
      </div>
    </div>
  );
}
