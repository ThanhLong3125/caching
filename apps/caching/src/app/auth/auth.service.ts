import { Injectable } from "@nestjs/common";
import { UserService } from "../user/user.service";
import { JwtService } from '@nestjs/jwt';
import { Register } from "../user/DTO/register.dto";
import { CreateUserDto } from "../user/DTO/user.dto";

@Injectable()
export class AuthService{
    constructor(
        private readonly UserService: UserService,
        private readonly JwtService: JwtService
    ) {}

    async register(payload: Register): Promise<any>{
        const newUser = await this.UserService.createUser({
            ...CreateUserDto, 
            fullName: payload.fullname, 
            email: payload.emai, 
            password: payload.password
        })
        return {
            message: 'successfull',
            user: newUser._id
        }
    }
}