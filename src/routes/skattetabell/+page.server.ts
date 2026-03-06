import { supabase } from '$lib/supabaseClient';

export async function load({ url }) {
  const income = Number(url.searchParams.get('income') ?? 0);
  const year = Number(url.searchParams.get('year') ?? new Date().getFullYear());

  let tableTax = null;

  if (income > 0) {
    const { data, error } = await supabase
      .from('tax_table')
      .select('*')
      .eq('year', year)
      .lte('income_min', income)
      .gte('income_max', income)
      .single();

    if (!error && data) {
      tableTax = data.tax_amount;
    }
  }

  const assistansTax = Math.round(income * 0.30);
  const fkTax = Math.round(income * 0.18); // FK‑skatt (kan justeras senare)

  return {
    income,
    year,
    tableTax,
    assistansTax,
    fkTax
  };
}
