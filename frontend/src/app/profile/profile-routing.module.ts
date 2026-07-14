import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../core/guards/auth.guard';
import { Profile } from './profile.component';

const routes: Routes = [{ path: '', component: Profile, canActivate: [AuthGuard] }];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class ProfileRoutingModule {}