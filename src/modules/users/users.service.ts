import { Injectable } from '@nestjs/common';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  create(/* createUserDto: CreateUserDto */) {
    // TODO: Implement user creation logic
    return 'This action adds a new user';
  }

  findAll() {
    // TODO: Implement find all users logic
    return `This action returns all users`;
  }

  findOne(id: number) {
    // TODO: Implement find one user logic
    return `This action returns a #${id} user`;
  }

  update(id: number /* , updateUserDto: UpdateUserDto */) {
    // TODO: Implement user update logic
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    // TODO: Implement user removal logic
    return `This action removes a #${id} user`;
  }
}
