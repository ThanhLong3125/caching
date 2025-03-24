import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class Register{
    @IsString()
    @ApiProperty({
        example: 'ten cua ban '
    })
    fullname: string

    @IsEmail()
    @IsString()
    @ApiProperty({
        example: 'youremail@gmail.com'
    })
    emai: string;

    @IsString()
    @ApiProperty({
        example: 'yourpassword'
    })
    @MinLength(8)
    password: string;
}