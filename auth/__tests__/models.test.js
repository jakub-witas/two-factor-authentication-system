import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Sequelize, DataTypes } from 'sequelize'

let sequelize
let TestAuth

beforeAll(async () => {
  sequelize = new Sequelize(
    process.env.TEST_DB_DATABASE || 'test_db',
    process.env.TEST_DB_USER || 'postgres', 
    process.env.TEST_DB_PASSWORD || 'password',
    {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: process.env.TEST_DB_PORT || 5433,
      dialect: 'postgres',
      logging: false
    }
  )

  await sequelize.query("CREATE SEQUENCE IF NOT EXISTS AUTH_SEQ START 1")

  TestAuth = sequelize.define('Auth', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      defaultValue: sequelize.literal("nextval('AUTH_SEQ')")
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    method: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    secret: { 
      type: DataTypes.STRING, 
      defaultValue: null 
    },
    counter: { 
      type: DataTypes.INTEGER, 
      defaultValue: null 
    }
  }, {
    timestamps: false,
    tableName: 'auth'
  })

  await sequelize.sync({ force: true })
})

afterAll(async () => {
  await sequelize.query("DROP SEQUENCE IF EXISTS AUTH_SEQ CASCADE")
  await sequelize.close()
})

beforeEach(async () => {
  await TestAuth.destroy({ where: {} })
  await sequelize.query("ALTER SEQUENCE AUTH_SEQ RESTART WITH 1")
})

describe('Auth Model', () => {
  describe('Model Definition', () => {
    it('should have correct table name', () => {
      expect(TestAuth.tableName).toBe('auth')
    })

    it('should have correct attributes', () => {
      const attributes = TestAuth.rawAttributes
      
      expect(attributes.id).toBeDefined()
      expect(attributes.id.primaryKey).toBe(true)
      
      expect(attributes.user_id).toBeDefined()
      expect(attributes.user_id.allowNull).toBe(false)
      
      expect(attributes.method).toBeDefined()
      expect(attributes.method.allowNull).toBe(false)
      
      expect(attributes.secret).toBeDefined()
      expect(attributes.secret.defaultValue).toBe(null)
      
      expect(attributes.counter).toBeDefined()
      expect(attributes.counter.defaultValue).toBe(null)
    })

    it('should not have timestamps', () => {
      const attributes = TestAuth.rawAttributes
      expect(attributes.createdAt).toBeUndefined()
      expect(attributes.updatedAt).toBeUndefined()
    })
  })

  describe('PostgreSQL Sequence', () => {
    it('should auto-generate ID using PostgreSQL sequence', async () => {
      const auth1 = await TestAuth.create({
        user_id: 1,
        method: 'password'
      })
      
      const auth2 = await TestAuth.create({
        user_id: 2,
        method: 'totp'
      })

      expect(auth1.id).toBe(1)
      expect(auth2.id).toBe(2)
    })

    it('should handle sequence correctly after deletion', async () => {
      const auth1 = await TestAuth.create({
        user_id: 1,
        method: 'password'
      })
      
      await auth1.destroy()
      
      const auth2 = await TestAuth.create({
        user_id: 2,
        method: 'totp'
      })

      expect(auth2.id).toBe(2)
    })
  })

  describe('CRUD Operations', () => {
    it('should create auth record with required fields', async () => {
      const authData = {
        user_id: 1,
        method: 'password'
      }

      const auth = await TestAuth.create(authData)
      
      expect(auth.id).toBeDefined()
      expect(auth.user_id).toBe(1)
      expect(auth.method).toBe('password')
      expect(auth.secret).toBe(null)
      expect(auth.counter).toBe(null)
    })

    it('should create auth record with all fields', async () => {
      const authData = {
        user_id: 1,
        method: 'totp',
        secret: 'secret123',
        counter: 0
      }

      const auth = await TestAuth.create(authData)
      
      expect(auth.user_id).toBe(1)
      expect(auth.method).toBe('totp')
      expect(auth.secret).toBe('secret123')
      expect(auth.counter).toBe(0)
    })

    it('should find auth record by user_id', async () => {
      await TestAuth.create({
        user_id: 1,
        method: 'password',
        secret: 'hash123'
      })

      const auth = await TestAuth.findOne({
        where: { user_id: 1 }
      })

      expect(auth).not.toBe(null)
      expect(auth.user_id).toBe(1)
      expect(auth.method).toBe('password')
    })

    it('should update auth record', async () => {
      const auth = await TestAuth.create({
        user_id: 1,
        method: 'password',
        secret: 'oldSecret'
      })

      await auth.update({
        secret: 'newSecret',
        counter: 5
      })

      expect(auth.secret).toBe('newSecret')
      expect(auth.counter).toBe(5)
    })

    it('should delete auth record', async () => {
      const auth = await TestAuth.create({
        user_id: 1,
        method: 'password'
      })

      await auth.destroy()

      const foundAuth = await TestAuth.findByPk(auth.id)
      expect(foundAuth).toBe(null)
    })
  })

  describe('Validations', () => {
    it('should require user_id', async () => {
      const authData = {
        method: 'password'
      }

      await expect(TestAuth.create(authData))
        .rejects
        .toThrow(/user_id cannot be null/)
    })

    it('should require method', async () => {
      const authData = {
        user_id: 1
      }

      await expect(TestAuth.create(authData))
        .rejects
        .toThrow(/method cannot be null/)
    })

    it('should enforce method length limit', async () => {
      const authData = {
        user_id: 1,
        method: 'verylongmethodname' 
      }

      await expect(TestAuth.create(authData))
        .rejects
        .toThrow()
    })

    it('should accept method within length limit', async () => {
      const authData = {
        user_id: 1,
        method: 'password'
      }

      const auth = await TestAuth.create(authData)
      expect(auth.method).toBe('password')
    })
  })

  describe('Default Values', () => {
    it('should set secret to null by default', async () => {
      const auth = await TestAuth.create({
        user_id: 1,
        method: 'password'
      })

      expect(auth.secret).toBe(null)
    })

    it('should set counter to null by default', async () => {
      const auth = await TestAuth.create({
        user_id: 1,
        method: 'password'
      })

      expect(auth.counter).toBe(null)
    })

    it('should override default values when provided', async () => {
      const auth = await TestAuth.create({
        user_id: 1,
        method: 'totp',
        secret: 'provided_secret',
        counter: 10
      })

      expect(auth.secret).toBe('provided_secret')
      expect(auth.counter).toBe(10)
    })
  })

  describe('Queries with PostgreSQL Features', () => {
    beforeEach(async () => {
      await TestAuth.bulkCreate([
        { user_id: 1, method: 'password', secret: 'hash1' },
        { user_id: 1, method: 'totp', secret: 'secret1', counter: 0 },
        { user_id: 2, method: 'password', secret: 'hash2' },
        { user_id: 3, method: 'totp', secret: 'secret3', counter: 5 }
      ])
    })

    it('should find all auth methods for user', async () => {
      const auths = await TestAuth.findAll({
        where: { user_id: 1 }
      })

      expect(auths).toHaveLength(2)
      expect(auths.map(a => a.method)).toContain('password')
      expect(auths.map(a => a.method)).toContain('totp')
    })

    it('should find auth by user and method', async () => {
      const auth = await TestAuth.findOne({
        where: { 
          user_id: 1, 
          method: 'totp' 
        }
      })

      expect(auth).not.toBe(null)
      expect(auth.user_id).toBe(1)
      expect(auth.method).toBe('totp')
      expect(auth.secret).toBe('secret1')
    })

    it('should count auth methods per user', async () => {
      const count = await TestAuth.count({
        where: { user_id: 1 }
      })

      expect(count).toBe(2)
    })

    it('should use PostgreSQL ILIKE for case-insensitive search', async () => {
      const auths = await TestAuth.findAll({
        where: sequelize.where(
          sequelize.fn('UPPER', sequelize.col('method')),
          'PASSWORD'
        )
      })

      expect(auths).toHaveLength(2)
    })
  })
})