import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, IsOptional, IsNumber, IsNotEmpty } from "class-validator";

export class UpdateUserInforDTO {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ description: "Your email", example: "yourmail@gmail.com" })
  email: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: "Your phone number, default local is Vietnam", example: "+84901234567" })
  phone?: string | null;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: "Your address", example: "123 Main Street, City, Country" })
  address?: string | null;
  
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: "Your date of birth in DD/MM/YYYY format", example: "01/01/2000" })
  dateOfBirth?: string | null;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: "Gender: male, female, or other", example: "male" })
  gender?: string | null;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: "Your height in cm", example: 170 })
  height?: number | null;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: "Your weight in kg", example: 60 })
  weight?: number | null;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: "Your country", example: "Vietnam" })
  country?: string | null;
}
