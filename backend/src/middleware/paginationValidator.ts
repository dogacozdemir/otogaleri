import { Request, Response, NextFunction } from "express";

export function paginationValidator(req: Request, res: Response, next: NextFunction) {
  const { page, limit } = req.query;

  // Page validation
  if (page !== undefined) {
    const pageNum = Number(page);
    if (isNaN(pageNum) || pageNum < 1 || !Number.isInteger(pageNum)) {
      return res.status(400).json({ error: "Invalid page parameter. Must be a positive integer >= 1" });
    }
    req.query.page = String(pageNum);
  }

  // Limit validation
  if (limit !== undefined) {
    const limitNum = Number(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100 || !Number.isInteger(limitNum)) {
      return res.status(400).json({ error: "Invalid limit parameter. Must be an integer between 1 and 100" });
    }
    req.query.limit = String(limitNum);
  }

  next();
}

