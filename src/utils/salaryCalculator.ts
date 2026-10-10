import { SalaryComponent } from '@/types';

/**
 * Calculates Indian salary structure components directly from Monthly Salary
 */
export function calculateSalaryFromMonthly(monthlySalary: number): SalaryComponent {
  const basic = Math.round(monthlySalary * 0.50);
  const hra = Math.round(basic * 0.40);
  const specialAllowance = Math.max(0, monthlySalary - basic - hra);
  const grossMonthly = monthlySalary;
  const epfEmployee = Math.round(basic * 0.12);
  const professionalTax = 200; // Standard PT in Telangana / AP / Odisha
  const healthInsurance = 350;
  const tds = monthlySalary > 50000 ? Math.round((monthlySalary - 50000) * 0.10) : 0;
  const totalDeductions = epfEmployee + professionalTax + healthInsurance + tds;
  const netMonthly = Math.max(0, grossMonthly - totalDeductions);

  return {
    basic,
    hra,
    specialAllowance,
    conveyanceAllowance: 0,
    medicalAllowance: 0,
    grossMonthly,
    epfEmployee,
    professionalTax,
    tds,
    healthInsurance,
    totalDeductions,
    netMonthly,
    ctcAnnual: monthlySalary * 12,
  };
}

/**
 * Calculates Indian salary structure components from an Annual CTC
 */
export function calculateSalaryFromCTC(ctcAnnual: number): SalaryComponent {
  const monthlySalary = Math.round(ctcAnnual / 12);
  return calculateSalaryFromMonthly(monthlySalary);
}
