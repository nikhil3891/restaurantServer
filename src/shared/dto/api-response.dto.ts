export class ApiResponseDto<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;

  constructor(success: boolean, statusCode: number, message: string, data: T) {
    this.success = success;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  static ok<T>(data: T, message = 'Success'): ApiResponseDto<T> {
    return new ApiResponseDto(true, 200, message, data);
  }

  static created<T>(data: T, message = 'Created'): ApiResponseDto<T> {
    return new ApiResponseDto(true, 201, message, data);
  }
}
