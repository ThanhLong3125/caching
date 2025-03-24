import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UserService } from "../user/user.service";
import { Register } from "./DTO/register.dto";
import { CreateUserDto } from "../user/DTO/user.dto";
import { Login } from "./DTO/login.dto";
import { InjectModel } from "@nestjs/mongoose";
import { User } from "../user/schemas/user.schema";
import { Model } from "mongoose";
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from "./DTO/jwtpayload.dto";
import { TokenService } from "./token.service";

@Injectable()
export class AuthService {;

    constructor(
        private readonly UserService: UserService,
        private readonly TokenService: TokenService,
        @InjectModel(User.name) private readonly userModel: Model<User>,
    ) {}

    async register(payload: Register): Promise<any> {
        const newUser = await this.UserService.createUser({
            ...CreateUserDto,
            isVerified: true,
            fullName: payload.fullName,
            email: payload.email,
            password: payload.password
        })
        return {
            message: 'successfull',
            user: newUser._id
        }
    }

    async validateUser(payload: Login) {
        const user = await this.userModel.findOne({ email: payload.email });
        if (!user) {
            throw new UnauthorizedException('Invalid credentials: email');
        }
        const passwordValid = await bcrypt.compare(payload.password, user.password);
        if (!passwordValid) {
            throw new UnauthorizedException('Invalid credentials: password');
        }

        const { password, ...result } = user.toObject();
        return result;
    }

    async login(payload: Login) {
        const user = await this.validateUser(payload);
        const jwtPayload: JwtPayload = {email: user.email , sub: user._id.toString()};
        const accessToken = this.TokenService.createAccessToken(jwtPayload);
        const refreshToken = this.TokenService.createRefreshToken(jwtPayload);
        await this.userModel.findByIdAndUpdate(user._id, { refreshToken: refreshToken }, { new: true })
        return {
            accessToken,
            refreshToken,
        };
    }
}