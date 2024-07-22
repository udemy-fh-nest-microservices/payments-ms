import { Module } from '@nestjs/common';
import { NatsClientModule } from './register';

@Module({
  imports: [NatsClientModule],
  exports: [NatsClientModule],
})
export class NatsModule {}
