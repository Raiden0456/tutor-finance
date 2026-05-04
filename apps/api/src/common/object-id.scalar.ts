import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';
import { Types } from 'mongoose';

@Scalar('ObjectId')
export class ObjectIdScalar implements CustomScalar<string, string> {
  description = 'MongoDB ObjectId scalar (24-char hex string).';

  parseValue(value: unknown): string {
    if (typeof value !== 'string' || !Types.ObjectId.isValid(value)) {
      throw new Error('Invalid ObjectId');
    }
    return value;
  }

  serialize(value: unknown): string {
    if (value instanceof Types.ObjectId) return value.toHexString();
    if (typeof value === 'string') return value;
    throw new Error('Cannot serialize ObjectId');
  }

  parseLiteral(ast: ValueNode): string {
    if (ast.kind !== Kind.STRING || !Types.ObjectId.isValid(ast.value)) {
      throw new Error('Invalid ObjectId literal');
    }
    return ast.value;
  }
}
