import { IsString } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class Login {
    @IsString()
    @ApiProperty({
        example: 'youremail@gmail.com'
    })
    email: string

    @IsString()
    @ApiProperty({
        example: 'yourpassword'
    })
    password: string
}