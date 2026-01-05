import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

/**
 * Validation middleware factory
 * Creates a middleware that validates request body/params/query against a Zod schema
 */
export function validate(schema: z.ZodSchema, source: "body" | "params" | "query" = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === "body" ? req.body : source === "params" ? req.params : req.query;
      const validated = schema.parse(data);
      
      // Replace original data with validated (sanitized) data
      if (source === "body") {
        req.body = validated;
      } else if (source === "params") {
        req.params = validated as any;
      } else {
        req.query = validated as any;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        });
      }
      return res.status(500).json({ error: "Validation error" });
    }
  };
}

/**
 * Validate ID parameter from route params
 * Converts string ID to number and validates it's a positive integer
 */
export const validateIdParam = (req: Request, res: Response, next: NextFunction) => {
  const idSchema = z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number").transform(Number),
  });

  try {
    const validated = idSchema.parse({ id: req.params.id });
    req.params.id = String(validated.id); // Keep as string for consistency
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      });
    }
    return res.status(500).json({ error: "Validation error" });
  }
};

