import { SalaryComponent } from '@/types';

/**
 * Calculates Indian salary structure components from an Annual CTC
 */
export function calculateSalaryFromCTC(ctcAnnual: number): SalaryComponent {
  // Monthly Gross is typically ~88-92% of CTC/12 after subtracting employer contributions
  const monthlyBudget = Math.round(ctcAnnual / 12);

  // 1. Basic Salary (45% of monthly budget)
  const basic = Math.round(monthlyBudget * 0.45);

  // 2. HRA (50% of Basic in metro cities)
  const hra = Math.round(basic * 0.5);

  // 3. Fixed statutory allowances
  const conveyanceAllowance = 1600;
  const medicalAllowance = 1250;

  // 4. Employer PF contribution (12% of Basic)
  const epfEmployer = Math.round(basic * 0.12);

  // 5. Special Allowance (balancing figure so Gross + EPF Employer approx equals monthlyBudget)
  let specialAllowance = monthlyBudget - (basic + hra + conveyanceAllowance + medicalAllowance + epfEmployer);
  if (specialAllowance < 0) {
    specialAllowance = 2000;
  }

  // Gross Monthly Earnings = Basic + HRA + Conveyance + Medical + Special
  const grossMonthly = basic + hra + conveyanceAllowance + medicalAllowance + specialAllowance;

  // Employee Deductions
  const epfEmployee = Math.round(basic * 0.12);
  const professionalTax = 200; // Flat standard PT in Karnataka / Maharashtra / Telangana
  const healthInsurance = 1200; // Group Health Insurance

  // Estimated Monthly TDS (Income Tax) based on simplified slabs
  let estimatedAnnualTax = 0;
  if (ctcAnnual > 1500000) {
    estimatedAnnualTax = (ctcAnnual - 1500000) * 0.30 + 150000;
  } else if (ctcAnnual > 1000000) {
    estimatedAnnualTax = (ctcAnnual - 1000000) * 0.20 + 50000;
  } else if (ctcAnnual > 700000) {
    estimatedAnnualTax = (ctcAnnual - 700000) * 0.10;
  } else {
    estimatedAnnualTax = 0; // Rebate under Sec 87A
  }
  const tds = Math.round(estimatedAnnualTax / 12);

  const totalDeductions = epfEmployee + professionalTax + healthInsurance + tds;
  const netMonthly = grossMonthly - totalDeductions;

  return {
    basic,
    hra,
    specialAllowance,
    conveyanceAllowance,
    medicalAllowance,
    grossMonthly,
    epfEmployee,
    epfEmployer,
    professionalTax,
    tds,
    healthInsurance,
    totalDeductions,
    netMonthly,
    ctcAnnual,
  };
}
