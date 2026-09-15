"use client";
import { CareError } from "@/features/gascomp-care/components/care-customer-page";
export default function GascompCareError({ reset }: { reset: () => void }) { return <CareError reset={reset} />; }
