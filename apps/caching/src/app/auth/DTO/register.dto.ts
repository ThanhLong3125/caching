import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class Register{
    @IsString()
    @ApiProperty({
        example: 'your first name '
    })
    firstName: string;

    @IsString()
    @ApiProperty({
        example: 'your last name'
    })
    lastName: string;

    @IsEmail()
    @IsString()
    @ApiProperty({
        example: 'youremail@gmail.com'
    })
    email: string;

    @IsString()
    @ApiProperty({
        example: 'yourpassword'
    })
    @MinLength(8)
    password: string;
}