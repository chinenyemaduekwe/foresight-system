import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Account } from "@/data/mockData";

type Row = {
  id: string;
  name: string;
  industry: string | null;
  arr: number;
  days_to_renewal: number;
  champion: string | null;
  champion_status: Account["championStatus"];
  signals: Account["signals"];
};

function rowToAccount(r: Row): Account {
  return {
    id: r.id,
    name: r.name,
    industry: r.industry ?? "",
    arr: Number(r.arr),
    daysToRenewal: r.days_to_renewal,
    champion: r.champion ?? "",
    championStatus: r.champion_status,
    signals: r.signals,
  };
}

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async (): Promise<Account[]> => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id,name,industry,arr,days_to_renewal,champion,champion_status,signals")
        .order("name");
      if (error) throw error;
      return (data as unknown as Row[]).map(rowToAccount);
    },
  });
}