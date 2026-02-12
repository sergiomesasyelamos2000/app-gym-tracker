/**
 * Empty module mock for class-validator and class-transformer
 * These packages are used in backend DTOs but not needed in React Native
 * The decorators are just metadata and can be safely ignored in the frontend
 */

// Export empty functions for all decorators
const noOp = () => () => {};

module.exports = {
  // class-validator decorators
  IsString: noOp,
  IsNumber: noOp,
  IsBoolean: noOp,
  IsArray: noOp,
  IsObject: noOp,
  IsNotEmpty: noOp,
  IsOptional: noOp,
  IsEnum: noOp,
  IsUrl: noOp,
  IsIn: noOp,
  ValidateNested: noOp,

  // class-transformer decorators
  Type: noOp,
  Expose: noOp,
  Exclude: noOp,
  Transform: noOp,

  // Export everything else as noOp to handle any other decorators
  __esModule: true,
  default: {},
};
