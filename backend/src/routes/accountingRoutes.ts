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
} from "../controllers/accountingController";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";

const router = express.Router();

// Tüm route'lar authentication ve tenant guard gerektirir
router.use(authMiddleware);
router.use(tenantGuard);

// Gider işlemleri
router.get("/expenses-list", getExpensesList);
router.post("/expenses", addExpense);
router.put("/expenses/:id", updateExpense);
router.delete("/expenses/:id", deleteExpense);

// Gelir işlemleri
router.get("/income-list", getIncomeList);
router.post("/income", addIncome);
router.put("/income/:id", updateIncome);
router.delete("/income/:id", deleteIncome);

// Raporlar
router.get("/yearly-income-expense", getYearlyIncomeExpense);
router.get("/date-range-income-expense", getDateRangeIncomeExpense);
router.post("/convert-incomes", convertIncomesToCurrency);
router.post("/convert-expenses", convertExpensesToCurrency);

export default router;

