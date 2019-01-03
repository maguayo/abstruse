import { Component, OnInit, OnDestroy } from '@angular/core';
import { WorkersService } from '../shared/workers.service';
import { Worker, WorkerUsage } from '../shared/worker.class';
import { Subscription } from 'rxjs';
import { DataService } from 'src/app/shared/providers/data.service';

@Component({
  selector: 'app-workers-list',
  templateUrl: './workers-list.component.html',
  styleUrls: ['./workers-list.component.sass']
})
export class WorkersListComponent implements OnInit, OnDestroy {
  worker: Worker;
  workers: Worker[];
  fetchingWorkers: boolean;
  sub: Subscription;

  constructor(
    public workersService: WorkersService,
    public dataService: DataService
  ) { }

  ngOnInit() {
    this.worker = null;
    this.workers = [];
    this.fetchWorkers();

    this.dataService.socketInput.emit({ type: 'subscribe', data: { event: 'worker_updates', id: '' } });
    this.dataService.socketInput.emit({ type: 'subscribe', data: { event: 'worker_usage', id: '' } });

    this.sub = this.dataService.socketOutput.subscribe(ev => {
      const worker = this.findWorker(ev.data.cert_id);
      console.log(ev);
      switch (ev.type) {
        case 'worker_status':
          worker.status = ev.data.status;
          break;
        case 'worker_usage':
          worker.setUsage(new WorkerUsage(ev.data.capacity, ev.data.capacity_load, ev.data.cpu, ev.data.memory));
          break;
      }
    });
  }

  ngOnDestroy() {
    this.dataService.socketInput.emit({ type: 'unsubscribe', data: { event: 'worker_updates', id: '' } });
    this.dataService.socketInput.emit({ type: 'unsubscribe', data: { event: 'worker_usage', id: '' } });
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  edit(id: number): void {
    this.worker = Object.assign({}, this.workers.find(worker => worker.id === id));
    this.workersService.openEditDialog();
  }

  fetchWorkers(): void {
    this.fetchingWorkers = true;
    this.workersService.fetchWorkers().subscribe(resp => {
      if (resp && resp.data && resp.data.length) {
        this.workers = resp.data.map(w => {
          return new Worker(w.id, w.cert_id, w.ip, w.priority, w.status, w.created_at, w.updated_at);
        });
      }
    }, err => {
      console.error(err);
    }, () => {
      this.fetchingWorkers = false;
    });
  }

  private findWorker(cert_id: string): Worker {
    return this.workers.find(worker => worker.cert_id === cert_id);
  }
}