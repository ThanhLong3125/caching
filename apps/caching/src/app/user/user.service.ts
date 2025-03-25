import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { User, UserDocument } from "./schemas/user.schema";
import { Model } from "mongoose";
import { CreateUserDto } from "./DTO/user.dto";
import * as bcrypt from 'bcryptjs';
import { UpdateUserInforDTO } from "./DTO/updateInfor.dto";

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>
  ) { }

  async createUser(payload: CreateUserDto) {
    const existingUser = await this.userModel.findOne({ email: payload.email });
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }
    const hashedPassword = await bcrypt.hash(payload.password, 10);
    const user = await this.userModel.create({ ...payload, password: hashedPassword })
    return user.save();
  }

  async updateUserCommonInfor(payload: UpdateUserInforDTO) {
    let existingUser = await this.userModel.findOne({ email: payload.email });
    if (!existingUser) {
      throw new BadRequestException('Email not exists');
    }
    const updatedUser = { ...payload };
    await this.userModel.findOneAndUpdate({ email: existingUser.email }, { $set: updatedUser }, { new: true }).exec();
    return { message: `updated successfull` }
  }

  async returnAllUserInfor() {
    return this.userModel.find().select('-password -updatedAt').exec()
  }

  async GetProfile(id: string) {
    return await this.userModel.findById(id).select('-password -updatedAt -refreshToken').exec();
  }
}
