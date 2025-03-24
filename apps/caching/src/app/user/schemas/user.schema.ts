import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: null })
  phone?: string;

  @Prop({ default: null })
  dateOfBirth?: string;

  @Prop({ default: 'other', enum: ['male', 'female', 'other'] })
  gender?: string;

  @Prop({default: null})
  height?: number;

  @Prop({default: null})
  weight?: number;
  
  @Prop({ default: null })
  address?: string;

  @Prop({ default: null })
  country?: string;

  @Prop({default: false})
  protection_2: boolean;

  @Prop({default: false})
  status: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: 'user', enum: ['user', 'admin', 'moderator'] })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  refreshToken: string;

}

export const UserSchema = SchemaFactory.createForClass(User);
