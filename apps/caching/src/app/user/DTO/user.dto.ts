import { IsEmail, IsEnum, IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { Exclude } from 'class-transformer';

export class CreateUserDto {

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  fullName: string;

  @IsEmail()
  @IsString()
  email: string;

  @Exclude()
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  dateOfBirth?: Date;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  security_answer?: string;

  @IsOptional()
  @IsBoolean()
  protection_2?: boolean;

  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsEnum(['user', 'admin', 'moderator'])
  role?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
