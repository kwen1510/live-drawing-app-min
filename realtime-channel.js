import { getSupabaseClient } from './supabase-client.js';

const noop = () => {};

function createSupabaseMessageChannel(name){
  const client = getSupabaseClient();
  if(!client) return null;
  const channel = client.channel(name, {
    config: {
      broadcast: { self: false },
    },
  });

  const listeners = new Set();
  let subscribed = false;
  const pending = [];

  const notify = (payload) => {
    const event = { data: payload };
    listeners.forEach((listener) => {
      try{
        listener(event);
      }catch(err){
        console.error('[realtime] listener error', err);
      }
    });
  };

  channel.on('broadcast', { event: 'message' }, ({ payload }) => {
    notify(payload);
  });

  const flushPending = () => {
    if(!subscribed || !pending.length) return;
    const queue = pending.splice(0, pending.length);
    queue.forEach((msg) => {
      channel.send({ type: 'broadcast', event: 'message', payload: msg }).catch((err) => {
        console.error('[realtime] failed to send pending message', err);
      });
    });
  };

  channel.subscribe((status) => {
    if(status === 'SUBSCRIBED'){
      subscribed = true;
      flushPending();
    }else if(status === 'TIMED_OUT' || status === 'CHANNEL_ERROR'){
      console.error(`[realtime] channel ${name} status: ${status}`);
      subscribed = false;
    }else if(status === 'CLOSED'){
      subscribed = false;
    }
  }).catch((err) => {
    console.error('[realtime] channel subscribe error', err);
  });

  return {
    postMessage(message){
      if(!subscribed){
        pending.push(message);
        return;
      }
      channel.send({ type: 'broadcast', event: 'message', payload: message }).catch((err) => {
        console.error('[realtime] failed to send message', err);
      });
    },
    addEventListener(type, handler){
      if(type !== 'message' || typeof handler !== 'function') return;
      listeners.add(handler);
    },
    removeEventListener(type, handler){
      if(type !== 'message' || typeof handler !== 'function') return;
      listeners.delete(handler);
    },
    close(){
      listeners.clear();
      try{
        client.removeChannel(channel);
      }catch(err){
        console.error('[realtime] failed to remove channel', err);
      }
    },
  };
}

export function createMessageChannel(name){
  const supabaseChannel = createSupabaseMessageChannel(name);
  if(supabaseChannel) return supabaseChannel;
  if(typeof BroadcastChannel === 'function'){
    return new BroadcastChannel(name);
  }
  console.warn(`[realtime] Falling back to no-op channel for "${name}"`);
  return {
    postMessage: noop,
    addEventListener: noop,
    removeEventListener: noop,
    close: noop,
  };
}
