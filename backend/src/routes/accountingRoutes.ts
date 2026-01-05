import express from "express";
import {
  getExpensesList,
  getIncomeList,
  getYearlyIncomeExpense,
  getDateRangeIncomeExpense,
  addIncome,
  addExpense,
  updateExpense,
  deleteExpense,
  updateIncome,
  deleteIncome,
  convertIncomesToCurrency,
  convertExpensesToCurrency,
  validateCreateIncome,
  validateUpdateIncome,
  validateCreateExpense,
  validateUpdateExpense,
  validateIncomeId,
  validateExpenseId,
  validateCurrencyConversion,
} from "../controllers/accountingController";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";

const router = express.Router();

// Tüm route'lar authentication ve tenant guard gerektirir
router.use(authMiddleware);
router.use(tenantGuard);

// Gider işlemleri
router.get("/expenses-list", getExpensesList);
router.post("/expenses", validateCreateExpense, addExpense);
router.put("/expenses/:id", validateExpenseId, validateUpdateExpense, updateExpense);
router.delete("/expenses/:id", validateExpenseId, deleteExpense);

// Gelir işlemleri
router.get("/income-list", getIncomeList);
router.post("/income", validateCreateIncome, addIncome);
router.put("/income/:id", validateIncomeId, validateUpdateIncome, updateIncome);
router.delete("/income/:id", validateIncomeId, deleteIncome);

// Raporlar
router.get("/yearly-income-expense", getYearlyIncomeExpense);
router.get("/date-range-income-expense", getDateRangeIncomeExpense);
router.post("/convert-incomes", validateCurrencyConversion, convertIncomesToCurrency);
router.post("/convert-expenses", validateCurrencyConversion, convertExpensesToCurrency);

export default router;

