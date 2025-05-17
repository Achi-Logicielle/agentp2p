import { Schema, model, Document } from 'mongoose';

export interface IEventLog extends Document {
    device_id: string;
    timestamp: Date;
    event_type: string;
    severity: string;
    message: string;
}

const EventLogSchema = new Schema<IEventLog>({
    device_id: { type: String, required: true },
    timestamp: { type: Date, required: true },
    event_type: { type: String, required: true },
    severity: { type: String, required: true },
    message: { type: String, required: true },
});

export const EventLog = model<IEventLog>('EventLog', EventLogSchema);